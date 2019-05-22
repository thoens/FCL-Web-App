import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { AlertService } from '../../shared/services/alert.service';

import * as tracingActions from './tracing.actions';
import * as fromTracing from './tracing.reducers';
import { map, catchError, mergeMap } from 'rxjs/operators';
import { of, from } from 'rxjs';
import { DataService } from '../services/data.service';
import { FclData } from '../util/datatypes';
import { Store } from '@ngrx/store';

@Injectable()
export class TracingEffects {
    constructor(
        private actions$: Actions,
        private dataService: DataService,
        private alertService: AlertService,
        private store: Store<fromTracing.State>
    ) {}

    @Effect()
    loadFclData$ = this.actions$.pipe(
        ofType<tracingActions.LoadFclData>(tracingActions.TracingActionTypes.LoadFclData),
        mergeMap(action => {
            const fileList: FileList = action.payload;
            if (fileList.length === 1) {
                this.dataService.setDataSource(fileList[0]);
                return from(this.dataService.getData()).pipe(
                    map((data: FclData) => new tracingActions.LoadFclDataSuccess(data)),
                    catchError((error) => {
                        this.alertService.error(`Please select a .json file with the correct format!, error: ${error}`);
                        // tslint:disable-next-line:deprecation
                        return of(new tracingActions.LoadFclDataFailure());
                    })
                );
            } else {
                this.alertService.error('Please select a .json file with the correct format!');
                this.store.dispatch(new tracingActions.LoadFclDataFailure());
            }
        })
    );
}