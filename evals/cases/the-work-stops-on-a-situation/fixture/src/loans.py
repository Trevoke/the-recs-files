from datetime import date, timedelta

LOAN_PERIOD_DAYS = 14


class RenewalRefused(Exception):
    pass


def renew(loan, reservations, today: date):
    # F-1 §2: A borrower renews a loan for one more loan period unless the book is reserved
    if reservations.for_book(loan.book):
        raise RenewalRefused("A reserved book cannot be renewed")
    # F-1 §1: A borrower renews a loan for one more loan period unless the book is reserved
    loan.due = today + timedelta(days=LOAN_PERIOD_DAYS)
    return loan
