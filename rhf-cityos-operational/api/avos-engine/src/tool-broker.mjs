/** Execution gate: no default network access, no arbitrary tool names, no direct SQL. */
import { evaluateAction, ensureScope } from './policy.mjs';
export class GovernedToolBroker {
  #adapters; #approvalStore; #ledger; #enabled;
  constructor({adapters = {}, approvalStore, ledger, executionEnabled = false}) {
    if (typeof approvalStore?.getApprovals !== 'function' || typeof ledger?.record !== 'function' || typeof ledger?.get !== 'function') throw new Error('TRUSTED_PORTS_REQUIRED');
    this.#adapters = new Map(Object.entries(adapters)); this.#approvalStore=approvalStore; this.#ledger=ledger; this.#enabled=executionEnabled;
  }
  async dispatch({principal, intent, idempotencyKey}) {
    ensureScope(principal,intent);
    if (typeof idempotencyKey !== 'string' || !/^[a-zA-Z0-9:_-]{10,128}$/.test(idempotencyKey)) throw new Error('INVALID_IDEMPOTENCY_KEY');
    const prior = await this.#ledger.get(intent.tenantId,intent.municipalityId,idempotencyKey);
    if (prior) {
      if (prior.fingerprint !== intent.fingerprint) throw new Error('IDEMPOTENCY_CONFLICT');
      return { ...prior, reused:true };
    }
    const approvals = await this.#approvalStore.getApprovals(intent.id);
    const decision = evaluateAction({principal,intent,approvals,execute:true});
    if (!decision.permit) return { status:'DENIED', reason:decision.reason };
    if (!this.#enabled) return { status:'DRY_RUN', reason:'EXECUTION_DISABLED_BY_DEFAULT' };
    const adapter = this.#adapters.get(intent.action);
    if (!adapter || typeof adapter.execute !== 'function' || adapter.verifiedIntegration !== true) return { status:'DENIED', reason:'ALLOWLISTED_VERIFIED_ADAPTER_REQUIRED' };
    // Production implementation must atomically acquire a durable idempotency lease
    // and revalidate approval, intent fingerprint and scope inside the same transaction.
    return { status:'NOT_IMPLEMENTED', reason:'ATOMIC_OUTBOX_AND_IDEMPOTENCY_LEASE_REQUIRED_BEFORE_DISPATCH' };
  }
}
