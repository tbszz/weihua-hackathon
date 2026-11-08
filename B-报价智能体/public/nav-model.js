const NAVIGATION_TARGETS = {
  review: { kind: 'workspace', tab: 'findings' },
  tasks: { kind: 'drawer', view: 'tasks' },
  knowledge: { kind: 'drawer', view: 'knowledge' },
  evaluation: { kind: 'drawer', view: 'evaluation' },
};

export function getNavigationTarget(key) {
  return NAVIGATION_TARGETS[key] || NAVIGATION_TARGETS.review;
}
