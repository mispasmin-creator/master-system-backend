// Shared helper for the cross-table updatedAt "chain" used for MIS
// turnaround-time tracking: each workflow-stage table's updatedAt is NOT
// auto-managed — it stays NULL until the *next* stage's row is first
// created, at which point that next stage stamps THIS row's updatedAt with
// its own createdAt. Re-submitting/editing an already-existing stage row
// must NOT re-stamp the parent (only the row's first creation counts as
// "this indent advanced past this stage").
//
// Must be called with a transaction client (`tx`) so the existence check,
// the upsert, and the parent stamp are all atomic.
async function upsertStageAndStampParent(tx, { model, where, create, update, parentModel, parentWhere }) {
  const existing = await model.findUnique({ where });
  const row = await model.upsert({ where, create, update });

  if (!existing && parentModel) {
    await parentModel.update({ where: parentWhere, data: { updatedAt: row.createdAt } });
  }

  return row;
}

// Undoes a stage: deletes this stage's row and, if it existed, resets the
// parent (previous) stage's updatedAt back to null — the mirror image of
// upsertStageAndStampParent. Only allowed at the frontier of the chain: if
// a downstream (next) stage row already exists for this indent, revert is
// refused so the flow can't be broken — the caller must revert the later
// stage first.
async function revertStage(tx, { model, where, childModel, childWhere, parentModel, parentWhere }) {
  if (childModel) {
    const child = await childModel.findUnique({ where: childWhere });
    if (child) {
      const err = new Error('This indent has already moved past this stage — revert the later stage first.');
      err.statusCode = 400;
      throw err;
    }
  }

  const existing = await model.findUnique({ where });
  if (!existing) {
    const err = new Error('Nothing to revert — this stage has not been completed yet.');
    err.statusCode = 400;
    throw err;
  }

  await model.delete({ where });

  if (parentModel) {
    await parentModel.update({ where: parentWhere, data: { updatedAt: null } });
  }

  return existing;
}

module.exports = { upsertStageAndStampParent, revertStage };
