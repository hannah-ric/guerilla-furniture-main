export type Listener<T = any> = (payload?: T) => void;

export class SimpleEventEmitter {
  private listeners: Map<string, Listener[]> = new Map();

  on<T = any>(event: string, listener: Listener<T>): void {
    const list = this.listeners.get(event) || [];
    list.push(listener as Listener);
    this.listeners.set(event, list);
  }

  off<T = any>(event: string, listener: Listener<T>): void {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(listener as Listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  once<T = any>(event: string, listener: Listener<T>): void {
    const wrapper: Listener<T> = (payload) => {
      this.off(event, wrapper);
      listener(payload);
    };
    this.on(event, wrapper);
  }

  emit<T = any>(event: string, payload?: T): void {
    const list = this.listeners.get(event);
    if (!list) return;
    list.slice().forEach((fn) => fn(payload));
  }
}
