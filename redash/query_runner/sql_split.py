import sqlparse


def _sql_text(value):
    # sqlparse removed text_type in 0.5.x; str() is the compatible equivalent.
    return str(value)


def split_sql_statements(query):
    def strip_trailing_comments(stmt):
        idx = len(stmt.tokens) - 1
        while idx >= 0:
            tok = stmt.tokens[idx]
            if tok.is_whitespace or sqlparse.utils.imt(
                tok, i=sqlparse.sql.Comment, t=sqlparse.tokens.Comment
            ):
                stmt.tokens[idx] = sqlparse.sql.Token(sqlparse.tokens.Whitespace, " ")
            else:
                break
            idx -= 1
        return stmt

    def strip_trailing_semicolon(stmt):
        idx = len(stmt.tokens) - 1
        while idx >= 0:
            tok = stmt.tokens[idx]
            # we expect that trailing comments already are removed
            if not tok.is_whitespace:
                if (
                    sqlparse.utils.imt(tok, t=sqlparse.tokens.Punctuation)
                    and tok.value == ";"
                ):
                    stmt.tokens[idx] = sqlparse.sql.Token(
                        sqlparse.tokens.Whitespace, " "
                    )
                break
            idx -= 1
        return stmt

    def is_empty_statement(stmt):
        strip_comments = sqlparse.filters.StripCommentsFilter()

        # copy statement object. `copy.deepcopy` fails to do this, so just re-parse it
        st = sqlparse.engine.FilterStack()
        parsed = list(st.run(_sql_text(stmt)))
        if not parsed:
            return True

        stmt = parsed[0]
        sql = _sql_text(strip_comments.process(stmt))
        return sql.strip() == ""

    stack = sqlparse.engine.FilterStack()

    result = [stmt for stmt in stack.run(query)]
    result = [strip_trailing_comments(stmt) for stmt in result]
    result = [strip_trailing_semicolon(stmt) for stmt in result]
    result = [
        _sql_text(stmt).strip()
        for stmt in result
        if not is_empty_statement(stmt)
    ]

    if len(result) > 0:
        return result

    return [""]  # if all statements were empty - return a single empty statement


def combine_sql_statements(queries):
    return ";\n".join(queries)
