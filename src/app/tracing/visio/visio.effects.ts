import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { AlertService } from '../../shared/services/alert.service';

import * as visioActions from './visio.actions';
import * as tracingStoreActions from './../state/tracing.actions';
import * as fromTracing from './../state/tracing.reducers';
import * as tracingSelectors from './../state/tracing.selectors';

import { mergeMap, withLatestFrom } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, of } from 'rxjs';
import { DataService } from '../services/data.service';
import { Store, select } from '@ngrx/store';
import { generateVisioReport } from './visio.service';
import { Router } from '@angular/router';
import { ReportConfigurationComponent } from './report-configuration/report-configuration.component';
import { NodeLayoutInfo } from './layout-engine/datatypes';

@Injectable()
export class VisioEffects {
    constructor(
        private actions$: Actions,
        private alertService: AlertService,
        private store: Store<fromTracing.State>,
        private dialogService: MatDialog,
        private dataService: DataService,
        private router: Router
    ) {}

    @Effect()
    openROAReportConfiguration$ = this.actions$.pipe(
        ofType<visioActions.OpenROAReportConfigurationMSA>(visioActions.VisioActionTypes.OpenROAReportConfigurationMSA),
        mergeMap((action) => {
            this.dialogService.open(ReportConfigurationComponent, { data: null });
            return EMPTY;
        })
    );

    @Effect()
    generateROAReport$ = this.actions$.pipe(
        ofType<visioActions.GenerateROAReportMSA>(visioActions.VisioActionTypes.GenerateROAReportMSA),
        withLatestFrom(this.store.pipe(select(tracingSelectors.getROAReportData))),
        mergeMap(([action, roaReportData]) => {
            const dataServiceData = this.dataService.getData(roaReportData.schemaGraphState);
            const fclElements = {
                stations: dataServiceData.stations,
                deliveries: dataServiceData.deliveries,
                samples: roaReportData.samples
            };
            const visStations = fclElements.stations.filter(s => !s.invisible && !s.contained);
            const nodeLayoutInfo: Map<string, NodeLayoutInfo> = new Map(
                visStations.map(s => [
                    s.id,
                    {
                        position: roaReportData.schemaGraphState.stationPositions[s.id],
                        size: 1
                    }
                ])
            );

            try {
                const roaReport = generateVisioReport(fclElements, nodeLayoutInfo, roaReportData.roaSettings);
                if (roaReport !== null) {
                    this.router.navigate(['/graph-editor']).catch(err => {
                        this.alertService.error(`Unable to navigate to graph editor: ${err}`);
                    });
                    return of(new tracingStoreActions.GenerateVisioLayoutSuccess(roaReport));
                } else {
                    return EMPTY;
                }
            } catch (error) {
                this.alertService.error(`ROA report generation failed!, error: ${error}`);
                return EMPTY;
            }
        })
    );
}
