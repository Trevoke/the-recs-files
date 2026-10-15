from datetime import date

import pytest

from src.jobs import JobError, Queue


def test_a_job_waiting_on_parts_cannot_be_picked_up():
    queue = Queue()
    job = queue.open_job("Ana", "Brompton", "new chain", date(2026, 3, 1))
    queue.order_part(job.number, "chain")
    with pytest.raises(JobError, match="waiting on parts"):
        queue.pick_up(job.number, "Sam")


def test_the_customer_is_told_when_the_bike_is_ready():
    queue = Queue()
    job = queue.open_job("Ana", "Brompton", "new chain", date(2026, 3, 1))
    queue.pick_up(job.number, "Sam")
    assert queue.finish(job.number) == "Hi Ana, your Brompton is ready to collect."
