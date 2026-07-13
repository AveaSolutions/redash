/* eslint-disable */

const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const path = require("path");

function optionalRequire(module, defaultReturn = undefined) {
  try {
    require.resolve(module);
  } catch (e) {
    if (e && e.code === "MODULE_NOT_FOUND") {
      // Module was not found, return default value if any
      return defaultReturn;
    }
    throw e;
  }
  return require(module);
}

// Load optionally configuration object (see scripts/README)
const CONFIG = optionalRequire("./scripts/config", {});

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;
const isHotReloadingEnabled =
  isDevelopment && process.env.HOT_RELOAD === "true";

const redashBackend = process.env.REDASH_BACKEND || "http://localhost:5000";
const baseHref = CONFIG.baseHref || "/";
const staticPath = CONFIG.staticPath || "/static/";
const htmlTitle = CONFIG.title || "Redash";

const basePath = path.join(__dirname, "client");
const appPath = path.join(__dirname, "client", "app");

const extensionsRelativePath =
  process.env.EXTENSIONS_DIRECTORY || path.join("client", "app", "extensions");
const extensionPath = path.join(__dirname, extensionsRelativePath);

// Function to apply configuration overrides (see scripts/README)
function maybeApplyOverrides(config) {
  const overridesLocation =
    process.env.REDASH_WEBPACK_OVERRIDES || "./scripts/webpack/overrides";
  const applyOverrides = optionalRequire(overridesLocation);
  if (!applyOverrides) {
    return config;
  }
  console.info("Custom overrides found. Applying them...");
  const newConfig = applyOverrides(config);
  console.info("Custom overrides applied successfully.");
  return newConfig;
}

const config = {
  mode: isProduction ? "production" : "development",
  entry: {
    app: [
      "./client/app/index.js",
      "./client/app/assets/less/main.less",
      "./client/app/assets/less/ant.less"
    ],
    server: ["./client/app/assets/less/server.less"]
  },
  output: {
    path: path.join(basePath, "./dist"),
    filename: isProduction ? "[name].[contenthash].js" : "[name].js",
    publicPath: staticPath
  },
  resolve: {
    symlinks: false,
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    alias: {
      "@": appPath,
      extensions: extensionPath
    },
    fallback: {
      util: require.resolve("util/"),
      url: require.resolve("url/")
    }
  },
  plugins: [
    // bundle only default `moment` locale (`en`)
    new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /en/),
    new HtmlWebpackPlugin({
      template: "./client/app/index.html",
      filename: "index.html",
      excludeChunks: ["server"],
      release: process.env.BUILD_VERSION || "dev",
      staticPath,
      baseHref,
      title: htmlTitle
    }),
    isProduction &&
      new MiniCssExtractPlugin({
        filename: "[name].[contenthash].css"
      }),
    new WebpackManifestPlugin({
      fileName: "asset-manifest.json",
      publicPath: ""
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "client/app/assets/robots.txt" },
        { from: "client/app/unsupported.html" },
        { from: "client/app/unsupportedRedirect.js" },
        {
          from: "client/app/assets/css/*.css",
          to: "styles/[name][ext]"
        },
        { from: "client/app/assets/fonts", to: "fonts/" }
      ]
    }),
    isHotReloadingEnabled && new ReactRefreshWebpackPlugin({ overlay: false })
  ].filter(Boolean),
  optimization: {
    splitChunks: {
      chunks: chunk => {
        return chunk.name != "server";
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(t|j)sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve("babel-loader"),
            options: {
              plugins: [
                isHotReloadingEnabled && require.resolve("react-refresh/babel")
              ].filter(Boolean)
            }
          }
        ]
      },
      {
        test: /\.html$/,
        exclude: [/node_modules/, /index\.html/],
        type: "asset/source"
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: isProduction ? MiniCssExtractPlugin.loader : "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: !isProduction
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: isProduction ? MiniCssExtractPlugin.loader : "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: !isProduction
            }
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: ["autoprefixer"]
              },
              sourceMap: !isProduction
            }
          },
          {
            loader: "less-loader",
            options: {
              lessOptions: {
                javascriptEnabled: true,
                math: "always"
              },
              sourceMap: false
            }
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        type: "asset/resource",
        generator: {
          filename: "images/[path][name][ext]"
        }
      },
      {
        test: /\.geo\.json$/,
        type: "asset/resource",
        generator: {
          filename: "data/[hash:7][name][ext]"
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 10000
          }
        },
        generator: {
          filename: "fonts/[name].[hash:7][ext]"
        }
      }
    ]
  },
  devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
  stats: {
    children: false,
    modules: false,
    chunkModules: false
  },
  watchOptions: {
    ignored: /\.sw.$/
  },
  devServer: {
    devMiddleware: {
      publicPath: staticPath,
      index: "/static/index.html",
      stats: {
        modules: false,
        chunkModules: false
      }
    },
    historyApiFallback: {
      index: "/static/index.html",
      rewrites: [{ from: /./, to: "/static/index.html" }]
    },
    static: false,
    proxy: [
      {
        context: [
          "/login",
          "/logout",
          "/invite",
          "/setup",
          "/status.json",
          "/api"
        ],
        target: redashBackend + "/",
        changeOrigin: false,
        secure: false
      },
      {
        context: path => {
          // CSS/JS for server-rendered pages should be served from backend
          return /^\/static\/[a-z]+\.[0-9a-fA-F]+\.(css|js)$/.test(path);
        },
        target: redashBackend + "/",
        changeOrigin: true,
        secure: false
      }
    ],
    client: isHotReloadingEnabled ? { overlay: false } : undefined,
    hot: isHotReloadingEnabled
  },
  performance: {
    hints: false
  }
};

if (process.env.DEV_SERVER_HOST) {
  config.devServer.host = process.env.DEV_SERVER_HOST;
}

module.exports = maybeApplyOverrides(config);
