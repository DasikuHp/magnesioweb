type Listener = (active: boolean) => void;
let _active = false;
const _listeners = new Set<Listener>();

export const glassModeStore = {
  get: () => _active,
  set: (val: boolean) => {
    _active = val;
    _listeners.forEach(l => l(val));
  },
  subscribe: (fn: Listener) => {
    _listeners.add(fn);
    return () => {
      _listeners.delete(fn);
    };
  }
};
