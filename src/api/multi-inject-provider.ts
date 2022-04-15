import { Container, interfaces } from 'inversify';

export const MultiInjectProvider = Symbol.for('MultiInjectProvider');
export interface MultiInjectProvider<T extends object> {
  getAll(): T[];
}

class DefaultMultiInjectProvider<T extends object> implements MultiInjectProvider<T> {
  protected services: T[] | undefined;

  constructor(protected readonly serviceIdentifier: interfaces.ServiceIdentifier<T>, protected readonly container: interfaces.Container) {}

  getAll(): T[] {
    if (this.services === undefined) {
      const currentServices: T[] = [];
      if (this.container.isBound(this.serviceIdentifier)) {
        currentServices.push(...this.container.getAll(this.serviceIdentifier));
      }
      this.services = currentServices;
    }
    return this.services;
  }
}

export type Bindable = interfaces.Bind | interfaces.Container;

export function bindMultiInjectProvider(bindable: Bindable, id: symbol): void {
  const isContainer = typeof bindable !== 'function' && ('guid' in bindable || 'parent' in bindable);
  let bindingToSyntax;
  if (isContainer) {
    bindingToSyntax = (bindable as Container).bind(MultiInjectProvider);
  } else {
    bindingToSyntax = (bindable as interfaces.Bind)(MultiInjectProvider);
  }
  bindingToSyntax
    .toDynamicValue(ctx => new DefaultMultiInjectProvider(id, ctx.container))
    .inSingletonScope()
    .whenTargetNamed(id);
}
