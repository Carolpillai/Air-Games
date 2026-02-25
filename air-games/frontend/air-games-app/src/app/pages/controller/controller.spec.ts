import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Controller } from './controller';

describe('Controller', () => {
  let component: Controller;
  let fixture: ComponentFixture<Controller>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Controller]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Controller);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
