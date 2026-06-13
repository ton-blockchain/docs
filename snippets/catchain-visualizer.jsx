'use client';
import * as React from 'react';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Cog,
  Check,
  X,
} from 'lucide-react';

export const CatchainVisualizer = () => {
  const MESSAGE_COLORS = {
    Submit: '#6366f1',
    Approve: '#22c55e',
    Vote: '#0ea5e9',
    VoteFor: '#06b6d4',
    Precommit: '#f59e0b',
    Commit: '#3b82f6',
    DepRequest: '#475569',
  };

  const MESSAGE_LABELS = {
    Submit: 'Submit',
    Approve: 'Approve',
    Vote: 'Vote',
    VoteFor: 'VoteFor',
    Precommit: 'PreCommit',
    Commit: 'Commit',
    DepRequest: 'Dep req',
  };
  const MESSAGE_DESCRIPTIONS = {
    Submit: 'Proposer shares its round candidate with peers.',
    Approve: 'Validator approves a seen proposal so others can vote.',
    Vote: 'Validator votes for a proposal once approvals reach quorum.',
    VoteFor:
      'Coordinator guidance for slow attempts; points voting to a candidate.',
    Precommit:
      'Validator precommits after quorum votes to lock on a candidate.',
    Commit: 'Validator finalizes a candidate after quorum precommits.',
    DepRequest:
      'Catchain-level dependency request for missing messages; peers will resend the requested blocks.',
  };

  const LAYOUT = {
    centerX: 230,
    centerY: 200,
    nodeRing: 150,
    backdropRadius: 170,
    svgWidth: 520,
    svgHeight: 380,
    nodeRadius: 30,
    ringRadius: 34,
    proposerTimerRadius: 40,
  };

  const LOG_LIMIT = 14;
  const PRIORITY_MOD = 1000;
  const PRIORITY_LAG_FACTOR = 18;
  const APPROVAL_JITTER_MIN = 25;
  const APPROVAL_JITTER_MAX = 120;
  const NULL_PRIORITY = 9999;
  const VOTEFOR_RETRY_MS = 400;
  const PROPOSER_SELF_APPROVE_EXTRA_MS = 120;
  const LOGO_TEXT_OFFSET = 24;
  const LAGGING_DROP_PROBABILITY = 0.5;
  const VOTEFOR_INITIAL_DELAY_MS = 500;
  const DEP_REQUEST_RETRY_MS = 300;
  const DEFAULT_MAX_DEPS = 4;
  const SCROLLBAR_CSS = `
    .catchain-scroll,
    .committed-scroll {
      scrollbar-width: thin;
      scrollbar-color: var(--color-fd-border) transparent;
    }
    .catchain-scroll::-webkit-scrollbar {
      width: 10px;
    }
    .committed-scroll::-webkit-scrollbar {
      height: 10px;
    }
    .catchain-scroll::-webkit-scrollbar-track,
    .committed-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .catchain-scroll::-webkit-scrollbar-thumb,
    .committed-scroll::-webkit-scrollbar-thumb {
      background: var(--color-fd-border);
      border-radius: 9999px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    .catchain-scroll::-webkit-scrollbar-thumb:hover,
    .committed-scroll::-webkit-scrollbar-thumb:hover {
      background: var(--color-fd-muted-foreground);
      background-clip: padding-box;
    }
  `;

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createPositions(count) {
    const cx = LAYOUT.centerX;
    const cy = LAYOUT.centerY;
    const r = LAYOUT.nodeRing;
    const result = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      result.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    return result;
  }

  function createNode(index, pos) {
    return {
      id: `V${index + 1}`,
      label: `S${index + 1}`,
      pos,
      approved: new Set(),
      voted: new Set(),
      precommitted: new Set(),
      receivedEvents: {},
      committedTo: null,
      voteTarget: null,
      crashed: false,
      pendingActions: [],
      flushScheduled: false,
      votedThisAttempt: false,
      precommittedThisAttempt: false,
      lastVotedFor: null,
      lastPrecommitFor: null,
      lockedCandidate: null,
      lockedAtAttempt: 0,
      status: 'good',
      catchainStore: new Map(),
      pendingCatchain: new Map(),
      missingRequests: new Set(),
      lastCatchainHeight: 0,
    };
  }

  function makeCandidate(round, attempt, proposerIndex, proposerId) {
    const short = `${round}.${attempt}`;
    return {
      id: `R${round}-P${proposerIndex + 1}`,
      short,
      round,
      attempt,
      proposerIndex,
      proposerId,
      approvals: new Set(),
      votes: new Set(),
      precommits: new Set(),
      commits: new Set(),
      createdAt: null,
      priority: (proposerIndex + round - 1) % PRIORITY_MOD,
      submitted: false,
      submitAt: null,
      submitDelay: 0,
    };
  }

  function logEvent(model, text) {
    model.log.unshift({ t: model.time, text });
    if (model.log.length > LOG_LIMIT) {
      model.log = model.log.slice(0, LOG_LIMIT);
    }
  }

  function scheduleTask(model, delayMs, fn, label = '') {
    model.tasks.push({
      runAt: model.time + delayMs,
      fn,
      label,
    });
  }

  function getNode(model, nodeId) {
    return model.nodes.find((n) => n.id === nodeId);
  }

  function createCatchainEnvelope(model, from, actions, deps = []) {
    const nextHeight = (model.catchainHeights[from] || 0) + 1;
    model.catchainHeights[from] = nextHeight;
    const senderNode = getNode(model, from);
    const prevId = senderNode?.lastCatchainId || null;

    const idSet = new Set();
    const senderSet = new Set();
    let depList = [];
    const baseDeps = Array.from(new Set(deps || []));

    const senderFromId = (depId) => {
      if (!depId) return null;
      const m = /^([^-/]+)-h/.exec(depId);
      return m ? m[1] : depId;
    };

    const pushDep = (depId, depSender) => {
      if (!depId) return;
      const senderKey = depSender || senderFromId(depId) || depId;
      if (senderKey === from || idSet.has(depId) || senderSet.has(senderKey))
        return;
      idSet.add(depId);
      senderSet.add(senderKey);
      depList.push(depId);
    };

    if (baseDeps.length > 0 && senderNode) {
      baseDeps.forEach((depId) => {
        const env = senderNode.catchainStore.get(depId);
        pushDep(depId, env?.sender);
      });
    }

    if (depList.length === 0 && senderNode) {
      const candidates = Array.from(senderNode.frontier.values()).filter(
        (entry) => entry && entry.sender !== from,
      );
      candidates.sort((a, b) => (b.height || 0) - (a.height || 0));
      for (const c of candidates) {
        if (depList.length >= model.config.maxDeps) break;
        pushDep(c.id, c.sender);
      }
    }

    depList = Array.from(new Set(depList)).slice(0, model.config.maxDeps);

    return {
      id: `${from}-h${nextHeight}`,
      sender: from,
      height: nextHeight,
      prev: prevId,
      deps: depList,
      actions,
    };
  }

  function sendCatchainEnvelope(model, envelope, options = {}) {
    const { from, to, delay = 0, includeSelf = false } = options;
    const sender = getNode(model, from);
    model.nodes.forEach((node) => {
      if (to && node.id !== to) return;
      if (!includeSelf && node.id === from) return;
      if (
        sender &&
        sender.status === 'lagging' &&
        Math.random() < LAGGING_DROP_PROBABILITY
      ) {
        return;
      }
      const latency = randomBetween(
        model.config.latency[0],
        model.config.latency[1],
      );
      const sendAt = model.time + delay;
      const primary = envelope.actions?.[0]?.type || 'Catchain';
      model.messages.push({
        id: `${envelope.id}-${from}-${node.id}-${Math.random()
          .toString(16)
          .slice(2, 6)}`,
        transport: 'Catchain',
        envelope,
        actions: envelope.actions || [],
        primary,
        from,
        to: node.id,
        sendTime: sendAt,
        recvTime: sendAt + latency,
      });
    });
  }

  function sendDepRequest(model, from, to, missingIds) {
    if (!missingIds || missingIds.length === 0) return;
    const sender = getNode(model, from);
    if (
      sender &&
      sender.status === 'lagging' &&
      Math.random() < LAGGING_DROP_PROBABILITY
    ) {
      return;
    }
    const latency = randomBetween(
      model.config.latency[0],
      model.config.latency[1],
    );
    const sendAt = model.time;
    model.messages.push({
      id: `REQ-${from}-${to}-${Math.random().toString(16).slice(2, 6)}`,
      transport: 'DepRequest',
      missingIds,
      primary: 'DepRequest',
      from,
      to,
      sendTime: sendAt,
      recvTime: sendAt + latency,
      actions: [],
    });
  }

  function requestMissingDeps(
    model,
    node,
    missingIds,
    preferredPeer,
    force = false,
  ) {
    const uniqueIds = Array.from(new Set(missingIds || []));
    const outstanding = uniqueIds.filter(
      (id) => force || !node.missingRequests.has(id),
    );
    if (outstanding.length === 0) return;
    outstanding.forEach((id) => node.missingRequests.add(id));
    const preferred =
      preferredPeer && preferredPeer !== node.id
        ? getNode(model, preferredPeer)
        : null;
    const target =
      preferred && preferred.status !== 'crashed'
        ? preferred
        : model.nodes.find((n) => n.id !== node.id && n.status !== 'crashed');
    if (!target) return;
    logEvent(
      model,
      `${node.label} requested ${outstanding.length} dep(s) from ${target.label}`,
    );
    sendDepRequest(model, node.id, target.id, outstanding);
  }

  function tryDeliverPendingCatchain(model, node) {
    let progressed = true;
    while (progressed) {
      progressed = false;
      node.pendingCatchain.forEach((entry, mid) => {
        const remaining = [...entry.missing].filter(
          (dep) => !node.catchainStore.has(dep),
        );
        if (remaining.length === 0) {
          node.pendingCatchain.delete(mid);
          deliverCatchainEnvelope(model, node, entry.envelope, entry.from);
          progressed = true;
        } else {
          entry.missing = new Set(remaining);
        }
      });
    }
  }

  function deliverCatchainEnvelope(model, node, envelope, originalFrom) {
    if (!node || node.status === 'crashed') return;
    if (node.catchainStore.has(envelope.id)) return;
    const depsAndPrev = Array.from(
      new Set([
        ...(envelope.prev ? [envelope.prev] : []),
        ...(envelope.deps || []),
      ]),
    );
    const missing = depsAndPrev.filter((dep) => !node.catchainStore.has(dep));
    if (missing.length > 0) {
      logEvent(
        model,
        `${node.label} missing ${missing.length} dep(s) for ${
          envelope.id
        }: ${missing.join(', ')}`,
      );
      node.pendingCatchain.set(envelope.id, {
        envelope,
        missing: new Set(missing),
        from: originalFrom,
      });
      requestMissingDeps(model, node, missing, originalFrom);
      scheduleTask(
        model,
        DEP_REQUEST_RETRY_MS,
        () => {
          const pending = node.pendingCatchain.get(envelope.id);
          if (!pending) return;
          requestMissingDeps(
            model,
            node,
            [...pending.missing],
            originalFrom,
            true,
          );
        },
        'dep-retry',
      );
      return;
    }
    const depSenders = new Set();
    for (const depId of envelope.deps || []) {
      const depEnv = node.catchainStore.get(depId);
      if (depEnv) {
        if (depSenders.has(depEnv.sender)) {
          logEvent(
            model,
            `${node.label} rejected ${envelope.id} (duplicate deps from ${depEnv.sender})`,
          );
          return;
        }
        depSenders.add(depEnv.sender);
      }
    }
    node.catchainStore.set(envelope.id, envelope);
    node.missingRequests.delete(envelope.id);
    node.lastCatchainHeight = Math.max(
      node.lastCatchainHeight || 0,
      envelope.height || 0,
    );
    node.lastCatchainId = envelope.id;
    node.frontier.set(envelope.sender, {
      id: envelope.id,
      sender: envelope.sender,
      height: envelope.height || 0,
    });
    (envelope.actions || []).forEach((action) =>
      handleAction(model, node, action, envelope.sender),
    );
    tryDeliverPendingCatchain(model, node);
  }

  function handleDepRequest(model, node, message) {
    if (!message.missingIds || message.missingIds.length === 0) return;
    message.missingIds.forEach((id) => {
      const stored = node.catchainStore.get(id);
      if (stored) {
        sendCatchainEnvelope(model, stored, {
          from: node.id,
          to: message.from,
          includeSelf: false,
          delay: DEP_REQUEST_RETRY_MS / 10,
        });
      }
    });
  }

  function chooseVoteTarget(model, node) {
    const eligible = Object.values(model.candidates).filter((c) => {
      const state = c.approvals.size >= model.config.quorum;
      // this node has seen this
      const hasCurrentSeen = !node.receivedEvents[c.id]
        ? false
        : node.receivedEvents[c.id].approved >= model.config.quorum;

      return state && hasCurrentSeen;
    });

    if (eligible.length === 0) return null;

    if (model.isSlow) {
      if (!node.voteTarget) return null;
      const target = model.candidates[node.voteTarget];
      return target && target.approvals.size >= model.config.quorum
        ? target
        : null;
    }

    // fast attempt
    if (node.lockedCandidate) {
      const locked = model.candidates[node.lockedCandidate];
      if (locked && locked.approvals.size >= model.config.quorum) return locked;
    }
    if (node.lastVotedFor) {
      const prev = model.candidates[node.lastVotedFor];
      if (prev && prev.approvals.size >= model.config.quorum) return prev;
    }

    return eligible.reduce((best, cand) => {
      if (!best) return cand;
      return cand.priority < best.priority ? cand : best;
    }, null);
  }

  function broadcastBlock(model, options) {
    const { from, actions, delay = 0, includeSelf = false } = options;
    if (!actions || actions.length === 0) return;
    const sender = getNode(model, from);
    if (!sender || sender.status === 'crashed') return;
    const envelope = createCatchainEnvelope(model, from, actions);
    deliverCatchainEnvelope(model, sender, envelope, from);
    sendCatchainEnvelope(model, envelope, { from, delay, includeSelf });
  }

  function addEvent(node, candidateId, eventType) {
    if (!node.receivedEvents[candidateId]) {
      node.receivedEvents[candidateId] = {
        approved: 0,
        voted: 0,
        precommitted: 0,
        commited: 0,
      };
    }

    switch (eventType) {
      case 'approve': {
        node.receivedEvents[candidateId].approved += 1;
        break;
      }
      case 'vote': {
        node.receivedEvents[candidateId].voted += 1;
        break;
      }
      case 'precommit': {
        node.receivedEvents[candidateId].precommitted += 1;
        break;
      }
      case 'commit': {
        node.receivedEvents[candidateId].commited += 1;
        break;
      }
    }
  }

  function enqueueAction(model, node, action, delay = 0, includeSelf = false) {
    scheduleTask(
      model,
      delay,
      () => {
        if (node.status === 'crashed') return;
        if (action.type === 'Submit') {
          const cand = model.candidates[action.candidateId];
          if (cand && !cand.createdAt) {
            cand.createdAt = model.time;
          }
          if (cand) {
            cand.submitted = true;
          }
        }
        broadcastBlock(model, {
          from: node.id,
          actions: [action],
          includeSelf,
        });
      },
      'flush-block',
    );
  }

  function issueApproval(model, node, candidateId, opts = {}) {
    const candidate = model.candidates[candidateId];
    if (
      !candidate ||
      node.status === 'crashed' ||
      node.approved.has(candidateId)
    )
      return;
    node.approved.add(candidateId);
    // event for this view
    addEvent(node, candidateId, 'approve');
    candidate.approvals.add(node.id);
    if (!candidate.createdAt && candidate.approvals.size === 1) {
      candidate.createdAt = model.time;
    }
    logEvent(
      model,
      `${node.label} approved ${candidate.short} (approvals ${candidate.approvals.size}/${model.config.quorum})`,
    );
    enqueueAction(
      model,
      node,
      { type: 'Approve', candidateId },
      opts.delay || 0,
    );
    tryVote(model, candidateId);
  }

  function issueVote(model, node, candidateId) {
    const candidate = model.candidates[candidateId];
    if (!candidate || node.status === 'crashed' || node.votedThisAttempt)
      return;
    if (candidate.approvals.size < model.config.quorum) return;
    node.votedThisAttempt = true;
    node.lastVotedFor = candidateId;
    node.voted.add(candidateId);
    addEvent(node, candidateId, 'vote');
    candidate.votes.add(node.id);
    logEvent(
      model,
      `${node.label} voted ${candidate.short} (votes ${candidate.votes.size}/${model.config.quorum})`,
    );
    enqueueAction(model, node, { type: 'Vote', candidateId });
    tryPrecommit(model, node, candidateId);
  }

  function issuePrecommit(model, node, candidateId) {
    const candidate = model.candidates[candidateId];
    if (!candidate || node.status === 'crashed' || node.precommittedThisAttempt)
      return;
    if (candidate.votes.size < model.config.quorum) return;
    if (node.lastVotedFor !== candidateId) return;
    node.precommittedThisAttempt = true;
    node.lastPrecommitFor = candidateId;
    node.lockedCandidate = candidateId;
    node.lockedAtAttempt = model.attempt;
    node.precommitted.add(candidateId);
    addEvent(node, candidateId, 'precommit');
    candidate.precommits.add(node.id);
    logEvent(
      model,
      `${node.label} precommitted ${candidate.short} (precommits ${candidate.precommits.size}/${model.config.quorum})`,
    );
    enqueueAction(model, node, { type: 'Precommit', candidateId });
    tryCommit(model, node, candidateId);
  }

  function issueCommit(model, node, candidateId) {
    const candidate = model.candidates[candidateId];
    if (
      !candidate ||
      node.status === 'crashed' ||
      node.committedTo === candidateId
    )
      return;
    if (!node.precommittedThisAttempt || node.lastPrecommitFor !== candidateId)
      return;
    node.committedTo = candidateId;
    candidate.commits.add(node.id);
    addEvent(node, candidateId, 'commit');
    logEvent(
      model,
      `${node.label} committed ${candidate.short} (commits ${candidate.commits.size}/${model.config.quorum})`,
    );
    enqueueAction(model, node, { type: 'Commit', candidateId });
    if (
      !model.committedCandidate &&
      candidate.commits.size >= model.config.quorum
    ) {
      model.committedCandidate = candidateId;
      model.committedHistory = [
        ...(model.committedHistory || []),
        {
          id: candidateId,
          short: candidate.short,
          round: model.round,
          attempt: model.attempt,
          proposerId: candidate.proposerId,
          committedAt: model.time,
        },
      ];
      model.nextRoundAt = model.time + model.config.roundGap;
      logEvent(
        model,
        <>
          <Check style={{ display: 'inline' }} width={12} /> Round {model.round}{' '}
          locked on {candidate.short}, starting next round soon
        </>,
      );
    }
  }

  function tryVote(model) {
    model.nodes.forEach((node) => {
      if (node.votedThisAttempt) return;
      const target = chooseVoteTarget(model, node);
      if (!target) return;
      scheduleTask(
        model,
        model.config.simDelay,
        () => issueVote(model, node, target.id),
        'vote',
      );
    });
  }

  function tryPrecommit(model, node, candidateId) {
    const candidate = model.candidates[candidateId];
    if (!candidate || candidate.votes.size < model.config.quorum) return;

    // check that this node have seen quorum for votes
    if (
      !node.receivedEvents[candidateId] ||
      node.receivedEvents[candidateId].voted < model.config.quorum
    ) {
      return;
    }

    scheduleTask(
      model,
      model.config.simDelay,
      () => issuePrecommit(model, node, candidateId),
      'precommit',
    );
  }

  function tryCommit(model, node, candidateId) {
    const candidate = model.candidates[candidateId];
    if (!candidate || candidate.precommits.size < model.config.quorum) return;

    // check that this node have seen quorum for precommits so we can vote
    if (
      !node.receivedEvents[candidateId] ||
      node.receivedEvents[candidateId].precommitted < model.config.quorum
    ) {
      return;
    }

    scheduleTask(
      model,
      model.config.simDelay,
      () => issueCommit(model, node, candidateId),
      'commit',
    );
  }

  // TODO: it's for validation, not for actual delay
  function calcApprovalDelay(model, node, candidate, isSlow) {
    const base = isSlow ? model.config.DeltaInfinity : model.config.Delta;
    const priorityLag =
      (candidate.proposerIndex + node.label.length) * PRIORITY_LAG_FACTOR;
    const jitter = randomBetween(APPROVAL_JITTER_MIN, APPROVAL_JITTER_MAX);
    return base + priorityLag + jitter;
  }

  function getSimDelay() {
    // TODO: check proposer delay, ensure it with async scheduling
    return randomBetween(APPROVAL_JITTER_MIN, APPROVAL_JITTER_MAX);
  }

  function pickCoordinator(model, attempt) {
    const idx = attempt % model.nodes.length;
    return model.nodes[idx];
  }

  function getNodePriority(round, idx, total, C) {
    const start = (round - 1 + total) % total;
    let adj = idx;
    if (adj < start) adj += total;
    const prio = adj - start;
    return prio < C ? prio : -1;
  }

  function ensureNullCandidate(model) {
    if (model.nullCandidateId) return;
    const id = `R${model.round}-NULL`;
    const candidate = createCandidate(model, id);
    model.candidates[id] = candidate;
    model.nullCandidateId = id;
    model.nodes.forEach((node) => {
      scheduleTask(
        model,
        model.config.DeltaInfinity,
        () => issueApproval(model, node, id),
        'null-approve',
      );
    });
  }

  function sendVoteFor(model) {
    if (!model.isSlow) return;
    const coord = pickCoordinator(model, model.attempt);
    const candidates = Object.values(model.candidates).filter(
      (c) => !!c.createdAt,
    );
    if (candidates.length === 0) {
      scheduleTask(
        model,
        VOTEFOR_RETRY_MS,
        () => sendVoteFor(model),
        'voteFor-retry',
      );
      return;
    }
    const eligible = candidates.filter(
      (c) => c.approvals.size >= model.config.quorum,
    );
    if (eligible.length === 0) return;
    const choice = eligible[Math.floor(Math.random() * eligible.length)];
    model.voteForTarget = choice.id;
    logEvent(
      model,
      `${coord.label} suggests ${choice.short} for slow attempt via VoteFor`,
    );
    enqueueAction(model, coord, { type: 'VoteFor', candidateId: choice.id });
  }

  function handleAction(model, node, action, fromId) {
    let candidate = model.candidates[action.candidateId];
    switch (action.type) {
      case 'Submit': {
        if (!candidate) {
          const existing = Object.values(model.candidates).find(
            (c) =>
              c.proposerId === (action.proposerId || fromId) &&
              c.round === (action.round || model.round),
          );
          if (existing) {
            candidate = existing;
          } else {
            candidate = makeCandidate(
              action.round || model.round,
              action.attempt || model.attempt,
              action.proposerIndex ?? 0,
              action.proposerId || fromId,
            );
            model.candidates[action.candidateId] = candidate;
          }
        }
        if (!candidate.createdAt) candidate.createdAt = model.time;
        // const delay = calcApprovalDelay(model, node, candidate, model.isSlow);
        if (node.id === candidate.proposerId) {
          scheduleTask(
            model,
            // TODO: fix this const
            500,
            () => issueApproval(model, node, candidate.id),
            'proposer-self-approve',
          );
        } else if (!model.isSlow) {
          scheduleTask(
            model,
            getSimDelay(),
            () => issueApproval(model, node, candidate.id),
            'auto-approve',
          );
        }
        break;
      }
      case 'VoteFor': {
        node.voteTarget = action.candidateId;
        if (candidate && !node.approved.has(candidate.id)) {
          const delay = calcApprovalDelay(model, node, candidate, true);
          scheduleTask(
            model,
            delay,
            () => issueApproval(model, node, candidate.id),
            'voteFor-approve',
          );
        }
        tryVote(model);
        break;
      }
      case 'Approve': {
        if (candidate && !candidate.approvals.has(fromId)) {
          candidate.approvals.add(fromId);
        }

        addEvent(node, candidate.id, 'approve');
        tryVote(model);
        break;
      }
      case 'Vote': {
        if (candidate && !candidate.votes.has(fromId)) {
          candidate.votes.add(fromId);
          if (candidate.votes.size >= model.config.quorum) {
            model.nodes.forEach((n) => {
              if (
                n.lockedCandidate &&
                n.lockedCandidate !== candidate.id &&
                model.attempt > n.lockedAtAttempt
              ) {
                // TODO: add quorum check, any vote arrival in a later attempt clears your lock,
                n.lockedCandidate = null;
                n.lockedAtAttempt = 0;
              }
            });
          }
        }

        addEvent(node, candidate.id, 'vote');
        tryPrecommit(model, node, candidate.id);
        break;
      }
      case 'Precommit': {
        if (candidate && !candidate.precommits.has(fromId)) {
          candidate.precommits.add(fromId);
        }

        addEvent(node, candidate.id, 'precommit');
        tryCommit(model, node, candidate.id);
        break;
      }
      case 'Commit': {
        // TODO: fix next round individual start
        addEvent(node, candidate.id, 'commit');

        if (candidate && node.committedTo !== candidate.id) {
          node.committedTo = candidate.id;
          candidate.commits.add(node.id);
          if (
            !model.committedCandidate &&
            candidate.commits.size >= model.config.quorum
          ) {
            if (
              !node.receivedEvents[candidate.id] ||
              node.receivedEvents[candidate.id] < model.config.quorum
            ) {
              break;
            }

            model.committedCandidate = candidate.id;
            model.nextRoundAt = model.time + model.config.roundGap;
            logEvent(
              model,
              <>
                <Check style={{ display: 'inline' }} width={12} /> Round{' '}
                {model.round} locked on {candidate.short}, starting next round
                soon
              </>,
            );
          }
        }
        break;
      }
      default:
        break;
    }
  }

  function handleMessage(model, message) {
    const node = getNode(model, message.to);
    if (!node || node.status === 'crashed') return;
    if (node.status === 'lagging' && Math.random() < LAGGING_DROP_PROBABILITY)
      return;
    if (message.transport === 'Catchain') {
      deliverCatchainEnvelope(model, node, message.envelope, message.from);
    } else if (message.transport === 'DepRequest') {
      handleDepRequest(model, node, message);
    }
  }

  function deliverMessages(model) {
    const ready = [];
    const pending = [];
    model.messages.forEach((msg) => {
      if (msg.recvTime <= model.time) {
        ready.push(msg);
      } else {
        pending.push(msg);
      }
    });
    model.messages = pending;
    ready.forEach((msg) => handleMessage(model, msg));
  }

  function runTasks(model) {
    const ready = [];
    const future = [];
    model.tasks.forEach((task) => {
      if (task.runAt <= model.time) {
        ready.push(task);
      } else {
        future.push(task);
      }
    });
    model.tasks = future;
    ready.forEach((task) => {
      try {
        task.fn();
      } catch (err) {
        logEvent(model, `Task error: ${err?.message || err}`);
      }
    });
  }

  function startAttempt(model, options = {}) {
    const forced = options.forceSlow === true;
    model.attempt = options.attempt || model.attempt + 1;
    model.isSlow = forced || model.attempt > model.config.Y;
    model.attemptStartedAt = model.time;
    model.messages = [];
    model.tasks = [];
    model.voteForTarget = null;
    model.currentProposers = [];
    model.nodes.forEach((node) => {
      node.voted = new Set();
      node.precommitted = new Set();
      node.votedThisAttempt = false;
      node.precommittedThisAttempt = false;
      node.lastVotedFor = null;
      node.lastPrecommitFor = null;
      node.voteTarget = null;
    });
    Object.values(model.candidates).forEach((cand) => {
      cand.votes = new Set();
      cand.precommits = new Set();
    });

    const proposerSet = [];
    for (let i = 0; i < model.nodes.length; i += 1) {
      const prio = getNodePriority(
        model.round,
        i,
        model.nodes.length,
        model.config.C,
      );
      if (prio >= 0) {
        proposerSet.push({
          node: model.nodes[i],
          priority: prio,
          proposerIndex: i,
        });
      }
    }
    proposerSet.sort((a, b) => a.priority - b.priority);

    proposerSet.forEach(({ node: proposer, priority, proposerIndex }) => {
      let cand = Object.values(model.candidates).find(
        (c) => c.proposerId === proposer.id && c.round === model.round,
      );
      if (!cand) {
        cand = makeCandidate(
          model.round,
          model.attempt,
          proposerIndex,
          proposer.id,
        );
        cand.priority = priority;
        model.candidates[cand.id] = cand;
      } else {
        cand.priority = priority;
      }
      const submitDelay = Math.max(0, priority * model.config.Delta);
      const submitAt = model.time + submitDelay;
      model.currentProposers.push({
        nodeId: proposer.id,
        candidateId: cand.id,
        submitAt,
        submitDelay,
      });
      if (cand.submitted) {
        cand.submitAt = null;
        cand.submitDelay = 0;
        return;
      }
      cand.submitAt = submitAt;
      cand.submitDelay = submitDelay;
      enqueueAction(
        model,
        proposer,
        {
          type: 'Submit',
          candidateId: cand.id,
          round: model.round,
          attempt: model.attempt,
          proposerId: proposer.id,
          proposerIndex,
          priority,
        },
        submitDelay,
      );
      scheduleTask(
        model,
        submitDelay + PROPOSER_SELF_APPROVE_EXTRA_MS,
        () => issueApproval(model, proposer, cand.id),
        'proposer-instant-approve',
      );
    });

    const best = proposerSet.find(() => true);
    model.activeCandidateId = best
      ? Object.values(model.candidates).find(
          (c) => c.proposerId === best.node.id && c.round === model.round,
        )?.id || ''
      : '';

    logEvent(
      model,
      `Round ${model.round}, attempt ${model.attempt} (${
        model.isSlow ? 'slow' : 'fast'
      }), proposer window size ${model.config.C}`,
    );
    if (model.isSlow) {
      scheduleTask(
        model,
        VOTEFOR_INITIAL_DELAY_MS,
        () => sendVoteFor(model),
        'voteFor',
      );
    }
    ensureNullCandidate(model);
    scheduleTask(model, model.config.K, () => {
      if (!model.committedCandidate) {
        logEvent(model, `⏱️ Attempt ${model.attempt} timed out, moving on`);
        startAttempt(model, { attempt: model.attempt + 1 });
      }
    });
    tryVote(model);
  }

  function startRound(model, resetRoundNumber = false) {
    if (!resetRoundNumber) {
      model.round += 1;
    }
    model.attempt = 0;
    model.candidates = {};
    model.messages = [];
    model.tasks = [];
    model.committedCandidate = null;
    model.nextRoundAt = null;
    model.nullCandidateId = null;
    model.currentProposers = [];
    model.catchainHeights = {};
    model.nodes.forEach((node) => {
      model.catchainHeights[node.id] = 0;
    });
    model.nodes.forEach((node) => {
      node.approved = new Set();
      node.voted = new Set();
      node.precommitted = new Set();
      node.committedTo = null;
      node.voteTarget = null;
      node.pendingActions = [];
      node.flushScheduled = false;
      node.votedThisAttempt = false;
      node.precommittedThisAttempt = false;
      node.lastVotedFor = null;
      node.lastPrecommitFor = null;
      node.lockedCandidate = null;
      node.catchainStore = new Map();
      node.pendingCatchain = new Map();
      node.missingRequests = new Set();
      node.lastCatchainHeight = 0;
      node.lastCatchainId = null;
      node.frontier = new Map();
    });
    startAttempt(model, { attempt: 1 });
  }

  function createModel(config) {
    const positions = createPositions(config.numNodes);
    const nodes = positions.map((pos, idx) => createNode(idx, pos));
    const heights = {};
    nodes.forEach((n) => {
      heights[n.id] = 0;
    });
    /**
     * @type {Model}
     */
    const model = {
      config,
      time: 0,
      nodes,
      messages: [],
      tasks: [],
      candidates: {},
      activeCandidateId: '',
      attempt: 0,
      round: 1,
      attemptStartedAt: 0,
      isSlow: false,
      committedCandidate: null,
      nextRoundAt: null,
      log: [],
      committedHistory: [],
      voteForTarget: null,
      nullCandidateId: null,
      currentProposers: [],
      catchainHeights: heights,
    };
    startRound(model, true);
    return model;
  }

  /** @param model {ReturnType<createModel>} */
  function createCandidate(model, id) {
    return {
      id: id,
      short: `${model.round}.⊥`,
      round: model.round,
      attempt: model.attempt,
      proposerIndex: -1,
      proposerId: 'NULL',
      approvals: new Set(),
      votes: new Set(),
      precommits: new Set(),
      commits: new Set(),
      createdAt: model.time,
      priority: NULL_PRIORITY,
      submitted: false,
      submitAt: null,
      submitDelay: 0,
    };
  }

  function stepModel(model, dt) {
    model.time += dt;
    runTasks(model);
    deliverMessages(model);
    if (model.nextRoundAt && model.time >= model.nextRoundAt) {
      startRound(model);
    }
    return model;
  }

  // TODO: create an inverse fn
  function stepToNextEvent(model) {
    const times = [];
    model.tasks.forEach((t) => {
      if (t.runAt > model.time) times.push(t.runAt);
    });
    model.messages.forEach((m) => {
      if (m.recvTime > model.time) times.push(m.recvTime);
    });
    if (model.nextRoundAt && model.nextRoundAt > model.time) {
      times.push(model.nextRoundAt);
    }
    const next = times.length ? Math.min(...times) : model.time + 1;
    stepModel(model, Math.max(next - model.time, 1));
    return model;
  }

  const { useEffect, useRef, useState } = React;
  const DEFAULT_CONFIG = {
    numNodes: 5,
    latency: [80, 150],
    K: 8000, // 8 seconds per attempt
    roundGap: 200,
    Delta: 2000, // Δ_i = 2(i-1) seconds -> base 2s
    DeltaInfinity: 4000, // 2*C seconds with C=2
    Y: 3, // fast attempts
    C: 2, // round candidates
    simDelay: 70, // local processing/animation delay for follow-up actions
    frameMs: 90,
    quorum: 4,
    maxDeps: DEFAULT_MAX_DEPS,
  };
  const CONFIG_FIELDS = [
    {
      key: 'K',
      label: 'K (ms)',
      description: 'Attempt duration; 8000ms means 8 seconds per attempt.',
    },
    {
      key: 'Delta',
      label: 'Delta (ms)',
      description: 'Base Δ_i delay; 2000ms equals 2s for first step.',
    },
    {
      key: 'DeltaInfinity',
      label: 'DeltaInfinity (ms)',
      description: 'Upper delay bound for slow attempts; 2*C seconds.',
    },
    {
      key: 'Y',
      label: 'Y',
      description: 'Fast attempts before switching to slow attempts.',
    },
    {
      key: 'C',
      label: 'C',
      description: 'Number of round candidates in rotation.',
    },
    {
      key: 'maxDeps',
      label: 'maxDeps',
      description: 'Catchain: max dependency links per block (one per sender).',
    },
  ];
  const [config, setConfig] = useState(() => ({ ...DEFAULT_CONFIG }));
  const [configDraft, setConfigDraft] = useState(() => ({
    K: `${DEFAULT_CONFIG.K}`,
    Delta: `${DEFAULT_CONFIG.Delta}`,
    DeltaInfinity: `${DEFAULT_CONFIG.DeltaInfinity}`,
    Y: `${DEFAULT_CONFIG.Y}`,
    C: `${DEFAULT_CONFIG.C}`,
    maxDeps: `${DEFAULT_CONFIG.maxDeps}`,
  }));
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [eventLogOpen, setEventLogOpen] = useState(false);

  /**
   * @typedef {Object} Message
   * @property {string} id
   * @property {'Catchain' | 'DepRequest'} transport
   * @property {any} envelope
   * @property {any[]} actions
   * @property {any} primary
   * @property {string} from
   * @property {string} to
   * @property {number} sendTime
   * @property {number} recvTime
   *
   * @typedef {Object} Model
   * @property {Message[]} messages
   */

  const modelRef = useRef(/** @type {ReturnType<createModel> | null} */ (null));
  const [, setTick] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(0.05);
  const [selectedNodeId, setSelectedNodeId] = useState(
    /** @type {string | null} */ (null),
  );
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    /** @type {string | null} */ (null),
  );
  const [hoveredEventType, setHoveredEventType] = useState(
    /** @type {keyof MESSAGE_LABELS | null} */ (null),
  );
  const [eventTooltipPos, setEventTooltipPos] = useState({
    x: 0,
    y: 0,
    placement: 'bottom',
  });

  if (!modelRef.current) {
    modelRef.current = createModel(config);
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (!running) return;
      stepModel(modelRef.current, config.frameMs * speed);
      setTick((t) => t + 1);
    }, config.frameMs);
    return () => clearInterval(id);
  }, [config.frameMs, running, speed]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      const tagName = (event.target?.tagName || '').toUpperCase();
      const isTyping =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        tagName === 'BUTTON' ||
        event.target?.isContentEditable;

      if ((event.key === ' ' || event.key === 'Spacebar') && !isTyping) {
        event.preventDefault();
        setRunning((prev) => !prev);
        return;
      }

      if (event.key === 'Escape') {
        if (selectedMessage) {
          setSelectedMessage(null);
        } else if (selectedCandidateId) {
          setSelectedCandidateId(null);
        } else if (selectedNodeId) {
          setSelectedNodeId(null);
        } else if (configModalOpen) {
          setConfigModalOpen(false);
        } else if (eventLogOpen) {
          setEventLogOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    configModalOpen,
    eventLogOpen,
    selectedCandidateId,
    selectedMessage,
    selectedNodeId,
  ]);

  const model = modelRef.current;
  const activeCandidate = model.activeCandidateId
    ? model.candidates[model.activeCandidateId]
    : null;
  const candidates = Object.values(model.candidates)
    .filter((c) =>
      c.proposerId === 'NULL' ? c.approvals.size > 0 : !!c.createdAt,
    )
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const elapsedAttempt = Math.max(
    0,
    model.time - (model.attemptStartedAt || 0),
  );
  const attemptProgress = clamp(elapsedAttempt / (model.config.K || 1), 0, 1);
  const attemptRemaining = Math.max(0, (model.config.K || 0) - elapsedAttempt);
  const proposerTimerRadius =
    LAYOUT.proposerTimerRadius || LAYOUT.ringRadius + 6;
  const proposerTimerCircumference = 2 * Math.PI * proposerTimerRadius;
  const proposerTimersByNode = {};
  (model.currentProposers || []).forEach((entry) => {
    proposerTimersByNode[entry.nodeId] = entry;
  });

  const quorum = model.config.quorum;
  const numNodes = model.nodes.length;
  const PHASE_DEFS = [
    {
      key: 'Approve',
      label: 'Approve',
      set: 'approvals',
      color: MESSAGE_COLORS.Approve,
    },
    { key: 'Vote', label: 'Vote', set: 'votes', color: MESSAGE_COLORS.Vote },
    {
      key: 'Precommit',
      label: 'PreCommit',
      set: 'precommits',
      color: MESSAGE_COLORS.Precommit,
    },
    {
      key: 'Commit',
      label: 'Commit',
      set: 'commits',
      color: MESSAGE_COLORS.Commit,
    },
  ];
  const phaseRows = activeCandidate
    ? PHASE_DEFS.map((p) => ({
        ...p,
        count: activeCandidate[p.set].size,
        met: activeCandidate[p.set].size >= quorum,
      }))
    : [];
  const currentPhase = activeCandidate
    ? phaseRows.find((r) => !r.met) || phaseRows[phaseRows.length - 1]
    : null;
  const clearSelection = () => {
    setSelectedNodeId(null);
    setSelectedMessage(null);
    setSelectedCandidateId(null);
  };
  const stepOnce = () => {
    setRunning(false);
    stepToNextEvent(modelRef.current);
    setTick((t) => t + 1);
  };
  // NOTE: requires stepping to the previous event
  // const stepBack = () => {
  //   setRunning(false);
  //   stepToNextEvent(modelRef.current);
  //   setTick((t) => t - 1);
  // };

  const rebuildModel = (nextConfig) => {
    modelRef.current = createModel(nextConfig);
    setTick((t) => t + 1);
    setSelectedNodeId(null);
    setSelectedMessage(null);
    setSelectedCandidateId(null);
    setEventLogOpen(false);
  };

  const reset = () => {
    rebuildModel(config);
  };

  const openConfigModal = () => {
    setConfigDraft({
      K: `${config.K}`,
      Delta: `${config.Delta}`,
      DeltaInfinity: `${config.DeltaInfinity}`,
      Y: `${config.Y}`,
      C: `${config.C}`,
      maxDeps: `${config.maxDeps}`,
    });
    setSelectedNodeId(null);
    setSelectedMessage(null);
    setSelectedCandidateId(null);
    setConfigModalOpen(true);
  };

  const submitConfig = (e) => {
    e.preventDefault();
    const toNumber = (val, fallback) => {
      if (val === '') return fallback;
      const parsed = Number(val);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const updatedConfig = {
      ...config,
      K: toNumber(configDraft.K, config.K),
      Delta: toNumber(configDraft.Delta, config.Delta),
      DeltaInfinity: toNumber(configDraft.DeltaInfinity, config.DeltaInfinity),
      Y: toNumber(configDraft.Y, config.Y),
      C: toNumber(configDraft.C, config.C),
      maxDeps: toNumber(configDraft.maxDeps, config.maxDeps),
    };
    setConfig(updatedConfig);
    rebuildModel(updatedConfig);
    setConfigModalOpen(false);
  };

  const showEventTooltip = (evt, key) => {
    if (!MESSAGE_DESCRIPTIONS[key]) {
      setHoveredEventType(null);
      return;
    }
    const rect = evt.currentTarget.getBoundingClientRect();
    const viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth : LAYOUT.svgWidth;
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : LAYOUT.svgHeight;
    const tooltipWidth = 240;
    const tooltipHeight = 90;
    const gap = 12;
    const preferAbove = rect.bottom + tooltipHeight > viewportHeight - gap;
    const left = clamp(
      rect.left + rect.width / 2,
      tooltipWidth / 2 + gap,
      viewportWidth - tooltipWidth / 2 - gap,
    );
    const rawTop = preferAbove
      ? rect.top - tooltipHeight - gap
      : rect.bottom + gap;
    const top = Math.max(gap, rawTop);
    setEventTooltipPos({
      x: left,
      y: top,
      placement: preferAbove ? 'top' : 'bottom',
    });
    setHoveredEventType(key);
  };

  const hideEventTooltip = () => {
    setHoveredEventType(null);
  };

  return (
    <div className="rounded-2xl border border-fd-border bg-fd-card text-fd-foreground shadow-sm p-4 md:p-6">
      <style>{SCROLLBAR_CSS}</style>
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 min-w-24 items-center gap-1.5 rounded-lg bg-fd-secondary text-fd-secondary-foreground px-3 text-sm font-medium shadow-sm hover:brightness-95 cursor-pointer not-prose"
              onClick={() => setRunning((v) => !v)}
              title={running ? 'Pause (Space)' : 'Resume (Space)'}
            >
              {running ? (
                <>
                  <Pause width={16} /> Pause
                </>
              ) : (
                <>
                  <Play width={16} /> Resume
                </>
              )}
            </button>
            {/* <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fd-secondary text-fd-secondary-foreground px-3 text-sm font-medium shadow-sm hover:brightness-95 cursor-pointer not-prose"
              onClick={stepBack}
              title="Step to the previous event"
            >
              <Rewind width={16} /> Previous
            </button> */}
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fd-secondary text-fd-secondary-foreground px-3 text-sm font-medium shadow-sm hover:brightness-95 cursor-pointer not-prose"
              onClick={stepOnce}
              title="Step to the next event"
            >
              <FastForward width={16} /> Next
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fd-secondary text-fd-secondary-foreground px-3 text-sm font-medium shadow-sm hover:brightness-95 cursor-pointer not-prose"
              onClick={reset}
              title="Restart from round #1"
            >
              <RotateCcw width={16} /> Restart
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fd-secondary text-fd-secondary-foreground px-3 text-sm font-medium shadow-sm hover:brightness-95 cursor-pointer not-prose"
              onClick={openConfigModal}
              title="Restart from round #1"
            >
              <Cog width={16} /> Config
            </button>
          </div>
          <div className="min-w-50">
            <div className="max-w-80 flex items-center justify-between text-xs font-semibold text-fd-foreground">
              <span>Attempt timer</span>
              <span className="font-normal tabular-nums text-fd-muted-foreground">
                {attemptRemaining > 0
                  ? `${(attemptRemaining / 1000).toFixed(1)}s left`
                  : 'soon!'}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fd-border">
              <div
                className="h-full bg-fd-primary transition-[width]"
                style={{ width: `${Math.min(100, attemptProgress * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex min-w-40 flex-1 items-center gap-2">
            <span className="text-xs font-semibold text-fd-foreground">
              Speed
            </span>
            <input
              type="range"
              min="0.00005"
              max="0.25"
              step="0.0005"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-right text-xs tabular-nums text-fd-muted-foreground">
              {(speed * 4).toFixed(2)}x
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="max-h-130 min-h-130 lg:col-span-2 rounded-xl border border-fd-border bg-fd-muted">
          <div className="flex w-full h-full flex-col justify-between gap-2">
            <svg
              viewBox={`0 0 ${LAYOUT.svgWidth} ${LAYOUT.svgHeight}`}
              className="h-100 mt-4 mx-auto"
            >
              <circle
                cx={LAYOUT.centerX}
                cy={LAYOUT.centerY}
                r={LAYOUT.backdropRadius}
                style={{
                  fill: 'var(--color-fd-muted)',
                  stroke: 'var(--color-fd-border)',
                }}
                strokeWidth="2"
              />
              {model.nodes.map((node) => {
                const committed =
                  node.committedTo === model.committedCandidate &&
                  model.committedCandidate;
                const precommitted =
                  !committed &&
                  activeCandidate &&
                  node.precommitted.has(activeCandidate.id)
                    ? true
                    : false;
                const approved =
                  !committed &&
                  activeCandidate &&
                  node.approved.has(activeCandidate.id);
                const proposerTimer = proposerTimersByNode[node.id];
                let proposerProgress = 0;
                if (proposerTimer) {
                  const remaining = Math.max(
                    0,
                    (proposerTimer.submitAt || 0) - model.time,
                  );
                  const total = proposerTimer.submitDelay || 1;
                  proposerProgress = clamp(
                    1 - remaining / Math.max(total, 1),
                    0,
                    1,
                  );
                  if (model.candidates[proposerTimer.candidateId]?.submitted) {
                    proposerProgress = 1;
                  }
                }
                const ring = committed
                  ? '#3b82f6'
                  : precommitted
                    ? '#f59e0b'
                    : approved
                      ? '#22c55e'
                      : node.status === 'lagging'
                        ? '#eab308'
                        : node.status === 'crashed'
                          ? '#ef4444'
                          : '#94a3b8';
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.pos.x}, ${node.pos.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      r={LAYOUT.nodeRadius}
                      style={{
                        fill:
                          node.status === 'crashed'
                            ? 'rgba(239, 68, 68, 0.25)'
                            : node.status === 'lagging'
                              ? 'rgba(234, 179, 8, 0.25)'
                              : 'var(--color-fd-accent)',
                        stroke: 'var(--color-fd-border)',
                      }}
                      strokeWidth="3"
                    />
                    {proposerTimer && (
                      <circle
                        r={proposerTimerRadius}
                        fill="none"
                        style={{ stroke: 'var(--color-fd-muted-foreground)' }}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${proposerTimerCircumference} ${proposerTimerCircumference}`}
                        strokeDashoffset={
                          proposerTimerCircumference * (1 - proposerProgress)
                        }
                        transform="rotate(-90)"
                      />
                    )}
                    <circle
                      r={LAYOUT.ringRadius}
                      fill="none"
                      stroke={ring}
                      strokeWidth="4"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-medium"
                      style={{ fill: 'var(--color-fd-foreground)' }}
                    >
                      {node.label}
                    </text>
                    {node.committedTo && (
                      <text
                        y={LOGO_TEXT_OFFSET}
                        textAnchor="middle"
                        className="text-[9px] font-medium"
                        style={{ fill: 'var(--color-fd-muted-foreground)' }}
                      >
                        {node.committedTo}
                      </text>
                    )}
                  </g>
                );
              })}

              {model.messages.map((msg) => {
                const fromNode = getNode(model, msg.from);
                const toNode = getNode(model, msg.to);
                if (!fromNode || !toNode) return null;
                const duration = msg.recvTime - msg.sendTime || 1;
                const progress = clamp(
                  (model.time - msg.sendTime) / duration,
                  0,
                  1,
                );
                const isRequest = msg.transport === 'DepRequest';
                const x =
                  fromNode.pos.x + (toNode.pos.x - fromNode.pos.x) * progress;
                const y =
                  fromNode.pos.y + (toNode.pos.y - fromNode.pos.y) * progress;
                const primary = msg.primary || msg.type;
                const color = isRequest
                  ? MESSAGE_COLORS.DepRequest || '#475569'
                  : MESSAGE_COLORS[primary] || '#0ea5e9';
                const label = isRequest
                  ? 'Req'
                  : msg.actions && msg.actions.length > 1
                    ? `${MESSAGE_LABELS[primary] || primary}+${
                        msg.actions.length - 1
                      }`
                    : MESSAGE_LABELS[primary] || primary;
                return (
                  <g
                    key={msg.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedMessage(msg);
                      setSelectedNodeId(null);
                    }}
                  >
                    <line
                      x1={fromNode.pos.x}
                      y1={fromNode.pos.y}
                      x2={toNode.pos.x}
                      y2={toNode.pos.y}
                      style={{ stroke: 'var(--color-fd-border)' }}
                      strokeDasharray={isRequest ? '2 4' : '4 6'}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isRequest ? '7' : '6'}
                      fill={color}
                      stroke="#6b7280"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      className="text-[9px] font-medium"
                      style={{ fill: 'var(--color-fd-muted-foreground)' }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
              {activeCandidate && currentPhase && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={LAYOUT.centerX - 58}
                    y={LAYOUT.centerY - 34}
                    width="116"
                    height="68"
                    rx="12"
                    style={{
                      fill: 'transparent',
                      stroke: 'var(--color-fd-border)',
                    }}
                    strokeWidth="1.5"
                  />
                  <text
                    x={LAYOUT.centerX}
                    y={LAYOUT.centerY - 13}
                    textAnchor="middle"
                    className="text-sm font-semibold"
                    style={{ fill: 'var(--color-fd-muted-foreground)' }}
                  >
                    {activeCandidate.short}
                  </text>
                  <text
                    x={LAYOUT.centerX}
                    y={LAYOUT.centerY + 4}
                    textAnchor="middle"
                    className="text-sm font-bold"
                    style={{ fill: currentPhase.color }}
                  >
                    {model.committedCandidate
                      ? 'COMMITTED'
                      : currentPhase.label}
                  </text>
                  <text
                    x={LAYOUT.centerX}
                    y={LAYOUT.centerY + 22}
                    textAnchor="middle"
                    className="text-sm"
                    style={{ fill: 'var(--color-fd-muted-foreground)' }}
                  >
                    {currentPhase.count}/{quorum}
                    {currentPhase.met ? ' ✓' : ''}
                  </text>
                </g>
              )}
            </svg>

            <div className="mb-2 flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5">
              {Object.entries(MESSAGE_COLORS).map(([key, color]) => (
                <button
                  key={key}
                  type="button"
                  className="inline-flex cursor-help items-center gap-1.5 text-sm font-medium text-fd-muted-foreground hover:text-fd-foreground focus:outline-none"
                  onMouseEnter={(e) => showEventTooltip(e, key)}
                  onMouseLeave={hideEventTooltip}
                  onFocus={(e) => showEventTooltip(e, key)}
                  onBlur={hideEventTooltip}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: color }}
                  />
                  {MESSAGE_LABELS[key] || key}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-y-scroll max-h-130 catchain-scroll rounded-xl border border-fd-border bg-fd-card w-full ps-3">
          {(() => {
            if (selectedNodeId) {
              const node = model.nodes.find((n) => n.id === selectedNodeId);
              if (!node) return null;
              const setStatus = (status) => {
                node.status = status;
                if (status === 'crashed') {
                  node.pendingActions = [];
                  node.flushScheduled = false;
                }
                setTick((t) => t + 1);
              };
              return (
                <div className="flex flex-col text-sm text-fd-foreground gap-2">
                  <div className="relative">
                    <button
                      className="absolute top-3 right-0 text-xl text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                      onClick={clearSelection}
                      title="Back to overview"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-col not-prose gap-2 mt-2">
                    <p className="text-sm uppercase tracking-wide text-fd-muted-foreground">
                      Node{' '}
                      <span className="text-fd-foreground normal-case">
                        {node.label}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col justify-between h-full gap-4 not-prose">
                    <div className="flex flex-col gap-2 mt-4 text-xs">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Status</div>
                          <div className="text-xs text-right font-medium capitalize">
                            <span
                              className={
                                node.status === 'crashed'
                                  ? 'text-red-600 dark:text-red-400'
                                  : node.status === 'lagging'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              {node.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Committed</div>
                          <div className="text-xs text-fd-muted-foreground">
                            {node.committedTo || '—'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Locked</div>
                          <div className="text-xs text-fd-muted-foreground">
                            {node.lockedCandidate || '—'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Vote target</div>
                        <div className="text-xs text-fd-muted-foreground">
                          {node.voteTarget || '—'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Approvals</div>
                        <div className="text-xs text-fd-muted-foreground">
                          {node.approved.size}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Votes</div>
                        <div className="text-xs text-fd-muted-foreground">
                          {node.voted.size}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Precommits</div>
                        <div className="text-xs text-fd-muted-foreground">
                          {node.precommitted.size}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Pending deps</div>
                        <div className="text-xs text-fd-muted-foreground">
                          {node.pendingCatchain.size}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-sm uppercase tracking-wide text-fd-muted-foreground">
                        Update node status
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className="rounded-lg border px-2 py-1.5 text-xs font-medium shadow-sm bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/25 cursor-pointer"
                          onClick={() => setStatus('good')}
                        >
                          Good
                        </button>
                        <button
                          className="rounded-lg border px-2 py-1.5 text-xs font-medium shadow-sm bg-red-50 border-red-200 text-red-800 hover:bg-red-100 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/25 cursor-pointer"
                          onClick={() => setStatus('crashed')}
                        >
                          Crash
                        </button>
                        <button
                          className="rounded-lg border px-2 py-1.5 text-xs font-medium shadow-sm bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/25 cursor-pointer"
                          onClick={() => setStatus('lagging')}
                        >
                          Lag 50%
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (selectedMessage) {
              const fromNode = getNode(model, selectedMessage.from);
              const toNode = getNode(model, selectedMessage.to);
              const envelope = selectedMessage.envelope;
              const actions = selectedMessage.actions || [];
              return (
                <div className="flex flex-col text-sm text-fd-foreground gap-2">
                  <div className="relative">
                    <button
                      className="absolute top-3 right-0 text-xl text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                      onClick={clearSelection}
                      title="Back to overview"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-col not-prose gap-2 mt-2">
                    <p className="text-sm uppercase tracking-wide text-fd-muted-foreground">
                      Message{' '}
                      <span className="text-fd-foreground normal-case">
                        {selectedMessage.primary || selectedMessage.transport}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col justify-between h-full gap-4 not-prose">
                    <div className="flex flex-col gap-2 mt-4 text-xs">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">ID</div>
                          <div className="text-xs break-all text-fd-muted-foreground">
                            {selectedMessage.id}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">From → To</div>
                          <div className="text-xs text-fd-muted-foreground">
                            {fromNode ? fromNode.label : selectedMessage.from} →{' '}
                            {toNode ? toNode.label : selectedMessage.to}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Send → Recv</div>
                          <div className="text-xs text-fd-muted-foreground">
                            {Math.round(selectedMessage.sendTime)} →{' '}
                            {Math.round(selectedMessage.recvTime)} ms
                          </div>
                        </div>
                      </div>
                      {selectedMessage.transport === 'Catchain' && envelope && (
                        <div className="flex items-start justify-between">
                          <p className="font-semibold">Catchain block</p>
                          <div className="flex flex-col items-start text-xs text-fd-muted-foreground">
                            <div>
                              {envelope.id} (h{envelope.height || 0})
                            </div>
                            <div>prev: {envelope.prev || 'None'}</div>
                            <div>
                              deps:{' '}
                              {(envelope.deps || []).length === 0
                                ? 'None'
                                : (envelope.deps || []).join(', ')}
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedMessage.transport === 'DepRequest' && (
                        <div className="flex items-start justify-between">
                          <p className="font-semibold">Requested deps</p>
                          <div className="flex flex-col items-start">
                            {(selectedMessage.missingIds || []).length === 0
                              ? 'None listed'
                              : (selectedMessage.missingIds || []).join(', ')}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold">Actions</p>
                        {actions.length === 0 ? (
                          <p className="text-fd-muted-foreground">—</p>
                        ) : (
                          <ul className="list-disc space-y-0.5 pl-4">
                            {actions.map((act, idx) => (
                              <>
                                <li key={`${act.type}-${idx}`}>
                                  {act.type}
                                  {act.candidateId
                                    ? ` → ${act.candidateId}`
                                    : ''}
                                </li>
                              </>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <button
                      className="self-start rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm bg-red-50 border-red-200 text-red-800 hover:bg-red-100 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/25 cursor-pointer"
                      onClick={() => {
                        model.messages = model.messages.filter(
                          (m) => m !== selectedMessage,
                        );
                        clearSelection();
                        setTick((t) => t + 1);
                      }}
                    >
                      Drop message
                    </button>
                  </div>
                </div>
              );
            }

            if (selectedCandidateId) {
              const cand = model.candidates[selectedCandidateId];
              if (!cand) return null;
              const proposer = cand.proposerId
                ? model.nodes.find((n) => n.id === cand.proposerId)
                : null;
              const seenRows = [
                ['Approvals', 'approved'],
                ['Votes', 'voted'],
                ['Precommits', 'precommitted'],
                ['Commits', 'commited'],
              ];
              return (
                <div className="flex flex-col text-sm text-fd-foreground gap-2">
                  <div className="relative">
                    <button
                      className="absolute top-3 right-0 text-xl text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                      onClick={clearSelection}
                      title="Back to overview"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-col justify-between gap-4 mt-2">
                    <div className="flex flex-col not-prose gap-2">
                      <p className="text-sm uppercase tracking-wide text-fd-muted-foreground">
                        Candidate{' '}
                        <span className="text-fd-foreground normal-case">
                          {cand.id}
                        </span>
                      </p>
                      <p className="text-xs text-fd-muted-foreground">
                        Round {cand.round} • Attempt {cand.attempt} • Proposer{' '}
                        {proposer ? proposer.label : cand.proposerId} • Prio{' '}
                        {cand.priority}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs not-prose">
                      {seenRows.map(([label, field]) => (
                        <div
                          key={label}
                          className="flex flex-col rounded-lg border border-fd-border bg-fd-muted p-2"
                        >
                          <p className="mb-2 font-semibold">{label} seen</p>
                          <div className="flex flex-col gap-0.5">
                            {model.nodes.map((n) => (
                              <div
                                key={n.id}
                                className="flex items-center justify-between"
                              >
                                <span className="text-fd-muted-foreground">
                                  {n.label}
                                </span>
                                <span className="tabular-nums">
                                  {n.receivedEvents[cand.id]?.[field] || 0}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-3 text-sm">
                <p className="mb-1.5 text-sm uppercase tracking-wide text-fd-muted-foreground">
                  Round state
                </p>

                <div className="flex flex-col text-fd-foreground gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fd-foreground">
                      Round no.
                    </span>
                    <span className="text-xs tabular-nums text-fd-muted-foreground">
                      #{model.round}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fd-foreground">
                      Attempt
                    </span>
                    <span className="text-xs tabular-nums text-fd-muted-foreground">
                      {model.attempt} ({model.isSlow ? 'slow' : 'fast'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fd-foreground">
                      Proposer
                    </span>
                    <span className="text-xs tabular-nums text-fd-muted-foreground">
                      {activeCandidate
                        ? `S${activeCandidate.proposerIndex + 1}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fd-foreground">
                      Coordinator
                    </span>
                    <span className="text-xs tabular-nums text-fd-muted-foreground">
                      {model.isSlow
                        ? pickCoordinator(model, model.attempt).label
                        : 'N/A (fast)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fd-foreground">
                      VoteFor target
                    </span>
                    <span className="text-xs tabular-nums text-fd-muted-foreground">
                      {model.voteForTarget || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fd-foreground">
                      Committed
                    </span>
                    <span className="text-xs tabular-nums text-fd-muted-foreground">
                      {model.committedCandidate || '—'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-sm uppercase tracking-wide text-fd-muted-foreground">
                    Consensus phases
                    {activeCandidate ? ` • ${activeCandidate.short}` : ''}
                  </p>
                  {phaseRows.length === 0 ? (
                    <p className="text-xs text-fd-muted-foreground">
                      Waiting for an active candidate…
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {phaseRows.map((row) => (
                        <div key={row.key} className="flex items-center gap-2">
                          <span
                            className={
                              'w-24 text-xs ' +
                              (currentPhase && currentPhase.key === row.key
                                ? 'font-semibold text-fd-foreground'
                                : 'text-fd-muted-foreground')
                            }
                          >
                            {row.label}
                          </span>
                          <span className="flex items-center gap-1">
                            {model.nodes.map((n, i) => (
                              <span
                                key={n.id}
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{
                                  background:
                                    i < row.count
                                      ? row.color
                                      : 'var(--color-fd-border)',
                                }}
                              />
                            ))}
                            {row.met ? (
                              <Check style={{ display: 'inline' }} width={12} />
                            ) : (
                              ''
                            )}
                          </span>
                          <span className="ml-auto text-xs tabular-nums text-fd-muted-foreground">
                            {row.count} of {quorum} required
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <p className="mb-1.5 text-sm uppercase tracking-wide text-fd-muted-foreground">
                    Candidates
                  </p>
                  <div className="flex flex-col gap-2">
                    {candidates.length === 0 ? (
                      <p className="text-xs text-fd-muted-foreground">
                        No candidates yet.
                      </p>
                    ) : (
                      candidates.slice(0, 4).map((cand) => (
                        <button
                          key={cand.id}
                          type="button"
                          className="rounded-lg border border-fd-border bg-fd-muted p-2 text-left cursor-pointer hover:border-fd-foreground/30"
                          onClick={() => {
                            setSelectedCandidateId(cand.id);
                            setSelectedMessage(null);
                            setSelectedNodeId(null);
                          }}
                        >
                          <div className="flex items-center justify-between text-sm font-semibold text-fd-foreground">
                            <span>{cand.id}</span>
                            <span className="text-xs text-fd-muted-foreground">
                              #{cand.short}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-fd-muted-foreground justify-between">
                            <span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {cand.approvals.size}
                              </span>{' '}
                              apr
                            </span>
                            <span>
                              <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                                {cand.votes.size}
                              </span>{' '}
                              vote
                            </span>
                            <span>
                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                {cand.precommits.size}
                              </span>{' '}
                              pre
                            </span>
                            <span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {cand.commits.size}
                              </span>{' '}
                              commit
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="mt-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm uppercase tracking-wide text-fd-muted-foreground">
            Committed chain{model.committedHistory.length === 0 && ' (empty)'}
          </p>
          <div className="flex gap-2 text-xs/5 text-fd-muted-foreground">
            <span>
              Press <kbd className="mx-1">Space</kbd> to pause or resume
            </span>
            <span className="hidden xl:inline-block">•</span>
            <span>
              Press <kbd className="mx-1">Esc</kbd> to close modals and restore
              the overview pane
            </span>
          </div>
        </div>

        {model.committedHistory.length !== 0 && (
          <div
            className="overflow-x-scroll committed-scroll mb-4"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="flex min-h-24 items-center gap-2">
              {model.committedHistory.map((entry, idx) => {
                const proposer = entry.proposerId
                  ? model.nodes.find((n) => n.id === entry.proposerId)
                  : null;
                const isLast =
                  idx === (model.committedHistory || []).length - 1;
                return (
                  <div
                    key={`${entry.id}-${idx}`}
                    className="flex items-center gap-2"
                  >
                    <div className="min-w-35 rounded-lg border border-fd-border bg-fd-card px-3 py-2 shadow-sm">
                      <div className="text-xs font-semibold text-fd-foreground">
                        Round #{entry.round}
                      </div>
                      <div className="text-sm text-fd-muted-foreground">
                        Attempt: {entry.attempt} (
                        {model.isSlow ? 'slow' : 'fast'})
                      </div>
                      <div className="text-sm text-fd-muted-foreground">
                        Proposer: {proposer ? proposer.label : entry.proposerId}
                      </div>
                      <div className="text-sm tabular-nums text-fd-muted-foreground">
                        t+{Math.round(entry.committedAt)}ms
                      </div>
                    </div>
                    {!isLast && (
                      <span className="select-none text-fd-muted-foreground">
                        →
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-fd-border bg-fd-muted">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold not-prose"
          onClick={() => setEventLogOpen((v) => !v)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="uppercase tracking-wide text-fd-muted-foreground">
              Event log
            </span>
            {!eventLogOpen && model.log[0] && (
              <span className="truncate font-normal text-fd-muted-foreground">
                {model.log[0].text}
              </span>
            )}
          </span>
          <span className="text-fd-muted-foreground">
            {eventLogOpen ? 'Close' : 'Open'}
          </span>
        </button>
        {eventLogOpen && (
          <div className="max-h-56 overflow-auto border-t border-fd-border px-3 py-2 text-[12px] text-fd-foreground catchain-scroll">
            {model.log.length === 0 ? (
              <p className="text-fd-muted-foreground">Simulation warming up…</p>
            ) : (
              <div className="flex flex-col gap-1">
                {model.log.map((item, idx) => (
                  <div
                    key={`${item.t}-${idx}`}
                    className="border-b border-fd-border py-px leading-tight last:border-b-0"
                  >
                    <span className="mr-1 tabular-nums text-fd-muted-foreground">
                      t+{Math.round(item.t)}ms
                    </span>
                    {item.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {hoveredEventType && (
        <div
          className="pointer-events-none fixed z-40"
          style={{
            left: eventTooltipPos.x,
            top: eventTooltipPos.y,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="min-w-47.5 max-w-65 rounded-md bg-fd-popover px-3 py-2 text-fd-popover-foreground text-xs shadow-lg ring-1 ring-fd-border">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex h-3.5 w-3.5 rounded-full"
                style={{ background: MESSAGE_COLORS[hoveredEventType] }}
              />
              <span className="font-semibold">
                {MESSAGE_LABELS[hoveredEventType] || hoveredEventType}
              </span>
            </div>
            <div className="whitespace-pre-line leading-snug">
              {MESSAGE_DESCRIPTIONS[hoveredEventType]}
            </div>
          </div>
        </div>
      )}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-fd-card rounded-xl shadow-xl border border-fd-border w-110 max-w-full px-4">
            <div className="relative">
              <button
                className="absolute top-4 right-0 text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                onClick={() => setConfigModalOpen(false)}
                type="button"
                title="Close"
              >
                <X />
              </button>
            </div>
            <div className="flex flex-col">
              <div>
                <p className="text-base font-semibold text-fd-foreground leading-snug">
                  Simulation config
                </p>
                <p className="text-sm text-fd-foreground">
                  Update timing parameters — applying will restart the
                  emulation.
                </p>
              </div>
              <form className="flex flex-col gap-2" onSubmit={submitConfig}>
                {CONFIG_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="block text-sm text-fd-foreground"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fd-foreground">
                        {field.label}
                      </span>
                      <input
                        type="number"
                        name={field.key}
                        value={configDraft[field.key]}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="ml-3 w-36 rounded-md border border-fd-border bg-fd-card text-fd-foreground px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <p className="mt-1 text-xs text-fd-foreground">
                      {field.description}
                    </p>
                  </label>
                ))}
                <div className="flex items-center justify-end gap-2 mb-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm hover:bg-fd-muted cursor-pointer"
                    onClick={() => setConfigModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 shadow-sm hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200 dark:hover:bg-sky-500/25 cursor-pointer"
                  >
                    Apply config
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
