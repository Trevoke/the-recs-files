# F-1 §1: A gardener can be allocated a free plot
def allocate(plots, gardener):
    for plot in plots:
        if plot.holder is None:
            plot.holder = gardener
            return plot
    return None


# F-1 §2: A gardener can be allocated a free plot
def wait(waiting_list, gardener):
    waiting_list.append(gardener)
