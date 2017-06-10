import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
  MdCheckboxModule,
  MdDialogModule,
  MdIconModule,
  MdInputModule,
  MdMenuModule,
  MdRadioModule,
  MdSelectModule,
  MdSidenavModule,
  MdSliderModule,
  MdToolbarModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {NgxDatatableModule} from '@swimlane/ngx-datatable';
import {ScrollbarHelper} from '@swimlane/ngx-datatable/release/services/scrollbar-helper.service';
import {GraphComponent} from './graph/graph.component';
import {TableComponent} from './table/table.component';
import {DataService} from './util/data.service';
import {TracingService} from './graph/tracing.service';

import {AppComponent} from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        HttpModule,
        MdCheckboxModule,
        MdDialogModule,
        MdIconModule,
        MdInputModule,
        MdMenuModule,
        MdRadioModule,
        MdSelectModule,
        MdSidenavModule,
        MdSliderModule,
        MdToolbarModule,
        NgxDatatableModule
      ],
      declarations: [
        AppComponent,
        GraphComponent,
        TableComponent
      ],
      providers: [
        DataService,
        ScrollbarHelper,
        TracingService
      ]
    }).compileComponents().then();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title in a md-toolbar', () => {
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('md-toolbar').textContent).toContain('FoodChain-Lab');
  });
});
