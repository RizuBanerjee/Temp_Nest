type Listener = (suspended: boolean) => void;

let suspended = false;
const listeners: Listener[] = [];

export function setSuspended(value: boolean) {
  if (suspended === value) return;
  suspended = value;
  listeners.forEach((cb) => cb(value));
}

export function isSuspended() {
  return suspended;
}

export function onSuspendedChange(listener: Listener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}
