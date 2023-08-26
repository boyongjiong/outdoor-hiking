import { observable, action } from 'mobx';

export class Car {
  @observable
  public wheels: number = 4;

  @action
  public selfDestruct() {
    this.wheels = 0;
  }
}
