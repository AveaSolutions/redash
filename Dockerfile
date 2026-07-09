FROM node:16-bullseye AS frontend-builder

# Controls whether to build the frontend assets
ARG skip_frontend_build

ENV CYPRESS_INSTALL_BINARY=0
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# This codebase's lockfiles are npm v1 and depend on the `sql-formatter` git
# dependency, which npm 7+ rebuilds from source and fails on. Pin npm 6 (the
# version node:12 shipped, which this project was authored against).
RUN npm install --global --force npm@6.14.18

RUN useradd -m -d /frontend redash
USER redash

WORKDIR /frontend
COPY --chown=redash package.json package-lock.json /frontend/
COPY --chown=redash viz-lib /frontend/viz-lib

# Controls whether to instrument code for coverage information
ARG code_coverage
ENV BABEL_ENV=${code_coverage:+test}

RUN if [ "x$skip_frontend_build" = "x" ] ; then npm ci --unsafe-perm; fi

COPY --chown=redash client /frontend/client
COPY --chown=redash webpack.config.js /frontend/
RUN if [ "x$skip_frontend_build" = "x" ] ; then npm run build; else mkdir -p /frontend/client/dist && touch /frontend/client/dist/multi_org.html && touch /frontend/client/dist/index.html; fi

FROM python:3.10-slim-bullseye

EXPOSE 5000

# Controls whether to install extra dependencies needed for all data sources.
ARG skip_ds_deps
# Controls whether to install dev dependencies.
ARG skip_dev_deps

RUN useradd --create-home redash

# MS ODBC: use signed-by keyring (apt-key is deprecated). The Microsoft repo only publishes
# amd64 packages, so msodbcsql17 is installed on amd64 only (production images are amd64;
# arm64 is for local development, where the MSSQL ODBC runner degrades to disabled).
# msodbcsql17 (not 18): the mssql_odbc query runner hardcodes "ODBC Driver 17 for SQL Server".
RUN set -eux; \
  apt-get update && \
  apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    pwgen \
    libffi-dev \
    sudo \
    git-core \
    libpq-dev \
    g++ \
    unixodbc-dev \
    xmlsec1 \
    libssl-dev \
    freetds-dev \
    ca-certificates && \
  if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
    install -d /usr/share/keyrings && \
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg && \
    echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/11/prod bullseye main' > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql17; \
  fi && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Disable PIP Cache and Version Check
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_NO_CACHE_DIR=1

# We first copy only the requirements file, to avoid rebuilding on every file change.
COPY requirements_all_ds.txt ./
RUN if [ "x$skip_ds_deps" = "x" ] ; then pip install -r requirements_all_ds.txt ; else echo "Skipping pip install -r requirements_all_ds.txt" ; fi

COPY requirements_bundles.txt requirements_dev.txt ./
RUN if [ "x$skip_dev_deps" = "x" ] ; then pip install -r requirements_dev.txt ; fi

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . /app
COPY --from=frontend-builder /frontend/client/dist /app/client/dist
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
