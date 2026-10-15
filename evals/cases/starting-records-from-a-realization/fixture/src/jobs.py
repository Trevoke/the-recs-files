from dataclasses import dataclass, field
from datetime import date


class JobError(Exception):
    pass


@dataclass
class Job:
    number: int
    customer: str
    bike: str
    work: str
    opened: date
    mechanic: str | None = None
    status: str = "waiting"
    parts_on_order: list[str] = field(default_factory=list)


class Queue:
    def __init__(self):
        self.jobs: dict[int, Job] = {}
        self.next_number = 1

    def open_job(self, customer, bike, work, today):
        if not work.strip():
            raise JobError("Say what work the bike needs before opening a job.")
        job = Job(self.next_number, customer, bike, work, today)
        self.jobs[job.number] = job
        self.next_number += 1
        return job

    def pick_up(self, number, mechanic):
        job = self._find(number)
        if job.status != "waiting":
            raise JobError(f"Job {number} is already with {job.mechanic}.")
        if job.parts_on_order:
            raise JobError(f"Job {number} is waiting on parts: {', '.join(job.parts_on_order)}.")
        job.mechanic = mechanic
        job.status = "in progress"
        return job

    def order_part(self, number, part):
        job = self._find(number)
        job.parts_on_order.append(part)
        return job

    def part_arrived(self, number, part):
        job = self._find(number)
        job.parts_on_order.remove(part)
        return job

    def finish(self, number):
        job = self._find(number)
        if job.status != "in progress":
            raise JobError(f"Job {number} has not been picked up.")
        job.status = "ready"
        return f"Hi {job.customer}, your {job.bike} is ready to collect."

    def collect(self, number):
        job = self._find(number)
        if job.status != "ready":
            raise JobError(f"Job {number} is not ready yet.")
        del self.jobs[number]
        return job

    def waiting(self):
        return sorted(
            (j for j in self.jobs.values() if j.status == "waiting" and not j.parts_on_order),
            key=lambda j: j.opened,
        )

    def _find(self, number):
        if number not in self.jobs:
            raise JobError(f"There is no job {number}.")
        return self.jobs[number]
