from redash.models.types import _encrypted_db_value_to_str


def test_encrypted_db_value_to_str_passes_through_str():
    assert _encrypted_db_value_to_str("encrypted-token") == "encrypted-token"


def test_encrypted_db_value_to_str_decodes_bytes():
    assert _encrypted_db_value_to_str(b"encrypted-token") == "encrypted-token"


def test_encrypted_db_value_to_str_decodes_memoryview():
    assert _encrypted_db_value_to_str(memoryview(b"encrypted-token")) == "encrypted-token"


def test_encrypted_db_value_to_str_passes_through_none():
    assert _encrypted_db_value_to_str(None) is None
