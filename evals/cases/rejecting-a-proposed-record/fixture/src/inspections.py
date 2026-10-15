import sqlite3


# ADR-1 §Decision: Inspections are stored in SQLite
def connect(path):
    return sqlite3.connect(path)


def record_inspection(db, stand, position, notes):
    db.execute(
        "INSERT INTO inspections (stand, position, notes) VALUES (?, ?, ?)",
        (stand, position, notes),
    )
    db.commit()
