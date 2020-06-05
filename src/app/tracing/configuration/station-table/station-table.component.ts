import { takeWhile, take, tap } from 'rxjs/operators';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Store, select } from '@ngrx/store';
import * as fromTracing from '../../state/tracing.reducers';
import * as tracingSelectors from '../../state/tracing.selectors';
import * as tracingActions from '../../state/tracing.actions';
import { AlertService } from '../../../shared/services/alert.service';
import { StationTableViewComponent } from '../station-table-view/station-table-view.component';
import { TableService, ColumnOption } from '../../services/table.service';
import {
    BasicGraphState,
    TableSettings,
    DataServiceData,
    ObservedType,
    ShowType,
    TableMode,
    TableColumn,
    StationTable,
    StationTableRow,
    ComplexFilterCondition,
    NodeShapeType
} from '../../data.model';
import { DialogSelectData, DialogSelectComponent } from '../../dialog/dialog-select/dialog-select.component';
import { MatDialog } from '@angular/material/dialog';
import { FilterService, FilterColumn, Filter, ComplexFilter, VisibilityFilterStatus, VisibilityFilter } from './../services/filter.service';
import { Utils } from '../../util/non-ui-utils';
import * as _ from 'lodash';

interface StoreDataState {
    graphState: BasicGraphState;
    tableSettings: TableSettings;
}

@Component({
    selector: 'fcl-station-table',
    templateUrl: './station-table.component.html',
    styleUrls: ['./station-table.component.scss']
})
export class StationTableComponent implements OnInit, OnDestroy {

    @ViewChild(StationTableViewComponent, { static: false })
    private tableViewComponent: StationTableViewComponent;

    @ViewChild('buttonColTpl', { static: true }) buttonColTpl: TemplateRef<any>;
    @ViewChild('shapeColTpl', { static: true }) shapeColTpl: TemplateRef<any>;
    @ViewChild('visibilityColTpl', { static: true }) visibilityColTpl: TemplateRef<any>;
    @ViewChild('dataColTpl', { static: true }) dataColTpl: TemplateRef<any>;
    @ViewChild('shapeRowTpl', { static: true }) shapeRowTpl: TemplateRef<any>;
    @ViewChild('visibilityRowTpl', { static: true }) visibilityRowTpl: TemplateRef<any>;
    @ViewChild('dataRowTpl', { static: true }) dataRowTpl: TemplateRef<any>;

    stationRows: any[];
    stationColumns: any[];
    deliveryRows: any[];
    deliveryColumns: any[];

    propToColumnMap: { [key: string]: FilterColumn } = {};

    showConfigurationSideBar$: Observable<boolean> = this.store.pipe(
        select(tracingSelectors.getShowConfigurationSideBar),
        takeWhile(() => this.componentActive)
    );

    visibilityFilterStatus = VisibilityFilterStatus;
    visibilityFilter: VisibilityFilter = {
        filterText: FilterService.VISIBILITY_FILTER_NAME,
        visibilityStatus: VisibilityFilterStatus.UNFILTERED
    };
    private visibilityEnumLength: number = Object.keys(VisibilityFilterStatus).length / 2;

    private currentFilterColumns: FilterColumn[] = [];
    private rootFilter: Filter = {
        filterText: null,
        filterProps: []
    };
    private complexFilter: ComplexFilter = {
        filterText: FilterService.COMPLEX_FILTER_NAME,
        filterConditions: []
    };

    private nodeShapeTypes: string[] = Object.keys(NodeShapeType).map(key => NodeShapeType[key]);

    private componentActive: boolean = true;

    private filteredRows: any[] = [];
    private unfilteredRows: any[] = [];
    private stateSubscription: Subscription;

    private cachedState: StoreDataState;
    private cachedData: DataServiceData;

    constructor(
        private tableService: TableService,
        private dialogService: MatDialog,
        private filterService: FilterService,
        private store: Store<fromTracing.State>,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        this.showConfigurationSideBar$.subscribe(
            showConfigurationSideBar => {
                if (!showConfigurationSideBar) {
                    if (this.stateSubscription) {
                        this.stateSubscription.unsubscribe();
                        this.stateSubscription = null;
                    }
                } else {
                    if (!this.stateSubscription) {
                        this.stateSubscription = this.store.select(tracingSelectors.getTableData).subscribe(
                            (state) => this.applyState(state),
                            err => this.alertService.error(`getTableData store subscription failed: ${err}`)
                        );
                    }
                }
            },
            err => this.alertService.error(`showConfigurationSideBar store subscription failed: ${err}`)
        );

        const standardFilterTerm$: Observable<string> = this.store
            .pipe(
                select(tracingSelectors.getStandardFilterTerm)
        );

        const complexFilterConditions$: Observable<ComplexFilterCondition[]> = this.store
            .pipe(
                select(tracingSelectors.getStationComplexFilterConditions)
        );

        combineLatest([
            complexFilterConditions$,
            standardFilterTerm$
        ]).pipe(
            tap(([complexConditions, standardFilterTerm]) => {
                this.rootFilter.filterText = standardFilterTerm;
                this.complexFilter.filterConditions = complexConditions;
            }),
            tap(() => this.onFilterChange()),
            takeWhile(() => this.componentActive)
        ).subscribe();
    }

    selectMoreStationColumns() {
        const columnOptions: ColumnOption[] = this.tableService.getStationColumnOptions(
            this.cachedState.graphState,
            this.cachedState.tableSettings
        );

        const dialogData: DialogSelectData = {
            title: 'Input',
            options: columnOptions
        };

        this.dialogService.open(DialogSelectComponent, { data: dialogData }).afterClosed()
            .pipe(
                take(1)
            ).subscribe((selections: string[]) => {
                if (selections != null) {
                    // assumption, the selection is unordered
                    const oldOrder = this.tableViewComponent.getColumnOrdering();
                    const newOrder = [].concat(
                        oldOrder.filter(prop => selections.includes(prop)),
                        selections.filter(prop => !oldOrder.includes(prop))
                    );
                    this.store.dispatch(new tracingActions.SetTableColumnsSOA([this.cachedState.tableSettings.mode, newOrder]));
                }
            },
            error => {
                throw new Error(`error loading dialog or selecting columns: ${error}`);
            });
    }

    onFilterChange() {
        this.filteredRows = this.filterService.filterRows(
            [].concat(this.currentFilterColumns, this.rootFilter, this.complexFilter, this.visibilityFilter),
            this.unfilteredRows
        );
        this.stationRows = this.filteredRows;
        if (this.tableViewComponent) {
            this.tableViewComponent.recalculatePages();
        }
    }

    filterVisibilityColumn() {
        this.visibilityFilter.visibilityStatus = ++this.visibilityFilter.visibilityStatus % this.visibilityEnumLength;
        this.onFilterChange();
    }

    onMouseOver(row) {
        const stationId = row['id'];
        this.store.dispatch(new tracingActions.ShowGhostStationMSA({ stationId: stationId }));
    }

    onMouseLeave() {
        this.store.dispatch(new tracingActions.ClearGhostStationMSA());
    }

    ngOnDestroy() {
        this.componentActive = false;
    }

    private applyState(state: StoreDataState) {
        const newData: StationTable = this.tableService.getStationData(state.graphState);
        const dataServiceData: DataServiceData = newData.dataServiceData;

        if (
            !this.cachedState ||
            (
                this.cachedState.tableSettings !== state.tableSettings &&
                !this.isAlreadyHandledReorderingChange(this.cachedState.tableSettings, state.tableSettings)
            ) ||
            (
                state.tableSettings.showType === ShowType.SELECTED_ONLY && ((
                    state.tableSettings.mode === TableMode.STATIONS &&
                    dataServiceData.statSel !== this.cachedData.statSel
                ) || (
                    state.tableSettings.mode === TableMode.DELIVERIES &&
                    dataServiceData.delSel !== this.cachedData.delSel
                ))
            ) ||
            this.cachedData.stations !== dataServiceData.stations ||
            this.cachedData.deliveries !== dataServiceData.deliveries ||
            this.cachedData.statVis !== dataServiceData.statVis ||
            this.cachedData.tracingResult !== dataServiceData.tracingResult
        ) {
            this.updateTable(newData, state.tableSettings);
        } else if (
            this.cachedData.statSel !== dataServiceData.statSel ||
            this.cachedData.delSel !== dataServiceData.delSel
        ) {
            this.applySelection(state);
        }
        this.cachedState = {
            ...state
        };
        this.cachedData = {
            ...dataServiceData
        };
    }

    private isAlreadyHandledReorderingChange(oldTableSettings: TableSettings, newTableSettings: TableSettings): boolean {
        const ignoreField: keyof TableSettings = 'stationColumns';
        // fields to compare
        const fields = _.uniq(
            [].concat(Object.keys(oldTableSettings), Object.keys(newTableSettings))
        ).filter(field => field !== ignoreField);
        for (const field of fields) {
            if (oldTableSettings[field] !== newTableSettings[field]) {
                return false;
            }
        }
        return (
            oldTableSettings.stationColumns.length === newTableSettings.stationColumns.length && // column Count matches
            newTableSettings.stationColumns.every(col => oldTableSettings.stationColumns.includes(col)) && // column sets match
            this.tableViewComponent.getColumnOrdering().every(
                (value, index) => newTableSettings.stationColumns[index] === value
            ) // view is already up to date
        );
    }

    private updateTable(newData: StationTable, tableSettings: TableSettings) {
        if (newData) {
            const stationColumns: TableColumn[] = newData.columns;
            const stationRows: StationTableRow[] = newData.rows;

            this.store.dispatch(new tracingActions.SetStationColumnsForComplexFilterSSA({ stationColumns: stationColumns }));
            this.store.dispatch(new tracingActions.SetStationRowsForComplexFilterSSA({ stationRows: stationRows }));

            const buttonColumn: any = {
                name: ' ',
                prop: 'moreCol',
                resizeable: false,
                draggable: false,
                width: 20,
                headerTemplate: this.buttonColTpl,
                headerClass: 'fcl-more-columns-header-cell',
                cellClass: 'fcl-more-column-row-cell',
                frozenLeft: true
            };

            const shapeColumn: any = {
                name: ' ',
                prop: 'shapeCol',
                resizeable: false,
                draggable: false,
                width: 30,
                headerTemplate: this.shapeColTpl,
                cellTemplate: this.shapeRowTpl,
                headerClass: 'fcl-visibility-column-header-cell',
                cellClass: 'fcl-visibility-column-row-cell',
                comparator: this.shapeComparator.bind(this)
            };

            const visibilityColumn: any = {
                name: ' ',
                prop: 'visCol',
                resizeable: false,
                draggable: false,
                width: 30,
                headerTemplate: this.visibilityColTpl,
                cellTemplate: this.visibilityRowTpl,
                headerClass: 'fcl-visibility-column-header-cell',
                cellClass: 'fcl-visibility-column-row-cell',
                comparator: this.visibilityComparator
            };

            const dataColumns = tableSettings.stationColumns
                .map(prop => stationColumns.find(c => c.id === prop))
                .filter(c => c !== undefined)
                .map(stationColumn => {
                    return {
                        name: stationColumn.name,
                        prop: stationColumn.id,
                        resizable: false,
                        draggable: true,
                        headerTemplate: this.dataColTpl,
                        cellClass: this.getCellClass,
                        cellTemplate: this.dataRowTpl
                    };
                });

            this.stationColumns = [buttonColumn]
                .concat(shapeColumn)
                .concat(visibilityColumn)
                .concat(dataColumns);

            const currentFilterColumns = newData.columns
                .filter(column => {
                    const columnProp = column.id;
                    return tableSettings.stationColumns.includes(columnProp);

                })
                .map((column, index) => ({
                    id: 'c' + index,
                    prop: column.id,
                    name: column.name,
                    filterText: null as string,
                    filterProps: [column.id]
                }));

            const propToColumnMap: { [key: string]: FilterColumn } = currentFilterColumns.reduce((prevValue, currValue) => {
                prevValue[currValue.prop] = currValue;
                return prevValue;
            }, {} as { [key: string]: FilterColumn });

            this.rootFilter.filterProps = currentFilterColumns.map(filterColumn => filterColumn.prop);
            const filters: Filter[] = [].concat(currentFilterColumns, this.rootFilter, this.complexFilter, this.visibilityFilter);

            if (stationRows) {
                let stationElements: StationTableRow[] = [];
                stationElements = stationRows.filter(stationRow => !stationRow.contained);

                if (tableSettings.showType === ShowType.SELECTED_ONLY) {
                    stationElements = stationElements
                        .filter(stationRow => stationRow.selected);
                } else if (tableSettings.showType === ShowType.TRACE_ONLY) {
                    stationElements = stationElements
                        .filter(stationRow => stationRow.forward || stationRow.backward || stationRow.observed !== ObservedType.NONE);
                }

                this.propToColumnMap = propToColumnMap;
                this.currentFilterColumns = currentFilterColumns;
                this.unfilteredRows = stationElements;
                this.filteredRows = this.filterService.filterRows(
                    filters,
                    this.unfilteredRows
                );

                this.stationRows = this.filteredRows;
            } else {
                this.unfilteredRows = [];
                this.filteredRows = [];
                this.stationRows = [];
            }

            this.tableViewComponent.recalculateTable();
        }
    }

    private getCellClass({ row, column, value }): any {
        return {
            'fcl-row-cell-invisible': row['invisible'] === true
        };
    }

    private visibilityComparator(valueA, valueB, rowA, rowB, sortDirection): number {
        let result: number = 0;

        if (rowA['invisible'] === true && rowB['invisible'] === false) {
            result = -1;
        }
        if (rowA['invisible'] === false && rowB['invisible'] === true) {
            result = 1;
        }

        return result;
    }

    private shapeComparator(valueA, valueB, rowA, rowB, sortDirection): number {

        const shapeA = rowA['highlightingInfo']['shape'] ? rowA['highlightingInfo']['shape'] : NodeShapeType.CIRCLE;
        const shapeB = rowB['highlightingInfo']['shape'] ? rowB['highlightingInfo']['shape'] : NodeShapeType.CIRCLE;

        const colorA = rowA['highlightingInfo']['color'].length > 0 ? rowA['highlightingInfo']['color'][0] : [255, 255, 255];
        const colorB = rowB['highlightingInfo']['color'].length > 0 ? rowB['highlightingInfo']['color'][0] : [255, 255, 255];

        const hslA = Utils.rgbToHsl(colorA[0], colorA[1], colorA[2]);
        const hslB = Utils.rgbToHsl(colorB[0], colorB[1], colorB[2]);

        let result: number = 0;

        if (rowA['invisible'] === true && rowB['invisible'] === false) {
            result = -1;
        } else if (this.nodeShapeTypes.indexOf(shapeA) < this.nodeShapeTypes.indexOf(shapeB)) {
            result = -1;
        } else if (this.nodeShapeTypes.indexOf(shapeA) > this.nodeShapeTypes.indexOf(shapeB)) {
            result = 1;
        } else {
            if (hslA < hslB) {
                result = 1;
            } else if (hslA > hslB) {
                result = -1;
            } else {
                result = 0;
            }
        }

        return result;
    }

    private applySelection(state) {

    }

    onColumnOrderingChange(props: string[]): void {
        this.store.dispatch(new tracingActions.SetTableColumnsSOA([this.cachedState.tableSettings.mode, props]));
    }
}
