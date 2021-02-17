import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import html2canvas from 'html2canvas';
import { GraphState, GraphType, LegendInfo, StationId, Position, SchemaGraphState } from '../../../data.model';
import _ from 'lodash';
import { Action, Store } from '@ngrx/store';
import { ContextMenuRequestInfo, GraphServiceData, NodeId } from '../../graph.model';
import { GraphService } from '../../graph.service';
import { AlertService } from '@app/shared/services/alert.service';
import { filter } from 'rxjs/operators';
import { GraphDataChange, GraphViewComponent } from '../graph-view/graph-view.component';
import { CyConfig, GraphData } from '../../cy-graph/cy-graph';
import { mapGraphSelectionToFclElementSelection } from '../../graph-utils';
import { GisPositioningService } from '../../gis-positioning.service';
import { ContextMenuViewComponent } from '../context-menu/context-menu-view.component';
import { ContextMenuService } from '../../context-menu.service';
import { State } from '@app/tracing/state/tracing.reducers';
import { SetGisGraphLayoutSOA, SetSchemaGraphLayoutSOA, SetSelectedElementsSOA, SetStationPositionsAndLayoutSOA } from '@app/tracing/state/tracing.actions';
import { getGisGraphData, getGraphType, getMapConfig, getSchemaGraphData, getShowLegend, getShowZoom, getStyleConfig } from '@app/tracing/state/tracing.selectors';
import { BoundaryRect } from '@app/tracing/util/geometry-utils';
import { SchemaGraphService } from '../../schema-graph.service';

@Component({
    selector: 'fcl-schema-graph',
    templateUrl: './schema-graph.component.html',
    styleUrls: ['./schema-graph.component.scss']
})
export class SchemaGraphComponent implements OnInit, OnDestroy {

    private static readonly MIN_ZOOM = 0.001;
    private static readonly MAX_ZOOM = 10.0;

    @ViewChild('contextMenu', { static: true }) contextMenu: ContextMenuViewComponent;
    @ViewChild('graph', { static: true }) graphViewComponent: GraphViewComponent;

    private componentIsActive = false;

    showZoom$ = this.store.select(getShowZoom);
    showLegend$ = this.store.select(getShowLegend);
    graphType$ = this.store.select(getGraphType);
    styleConfig$ = this.store.select(getStyleConfig);

    private graphStateSubscription: Subscription;
    private graphTypeSubscription: Subscription;

    private cachedState: SchemaGraphState | null = null;
    private sharedGraphData: GraphServiceData | null = null;
    private schemaGraphData: GraphData | null = null;
    private legendInfo_: LegendInfo | null = null;
    private cyConfig_: CyConfig = {
        minZoom: SchemaGraphComponent.MIN_ZOOM,
        maxZoom: SchemaGraphComponent.MAX_ZOOM
    };

    constructor(
        private store: Store<State>,
        public elementRef: ElementRef,
        private graphService: GraphService,
        private schemaGraphService: SchemaGraphService,
        private contextMenuService: ContextMenuService,
        private alertService: AlertService
    ) {}

    ngOnInit() {

        this.componentIsActive = true;

        this.graphTypeSubscription = this.graphType$.subscribe(
            type => {
                if (type !== GraphType.GRAPH) {
                    if (this.graphStateSubscription) {
                        this.graphStateSubscription.unsubscribe();
                        this.graphStateSubscription = null;
                    }
                } else {
                    if (!this.graphStateSubscription) {
                        this.graphStateSubscription = this.store
                            .select(getSchemaGraphData)
                            .pipe(filter(() => this.componentIsActive))
                            .subscribe(
                                graphState => this.applyState(graphState),
                                err => this.alertService.error(`getGisGraphData store subscription failed: ${err}`)
                            );
                    }
                }
            },
            err => this.alertService.error(`getGraphType store subscription failed: ${err}`)
        );
    }

    ngOnDestroy() {
        this.componentIsActive = false;
        if (this.graphTypeSubscription) {
            this.graphTypeSubscription.unsubscribe();
            this.graphTypeSubscription = null;
        }
        if (this.graphStateSubscription) {
            this.graphStateSubscription.unsubscribe();
            this.graphStateSubscription = null;
        }
    }

    getCanvas(): Promise<HTMLCanvasElement> {
        return html2canvas(this.elementRef.nativeElement);
    }

    onContextMenuRequest(requestInfo: ContextMenuRequestInfo): void {
        const menuData = this.contextMenuService.getMenuData(requestInfo.context, this.sharedGraphData, false);
        this.contextMenu.open(requestInfo.position, menuData);
    }

    onContextMenuSelect(action: Action): void {
        if (action) {
            this.store.dispatch(action);
        }
    }

    onGraphDataChange(graphDataChange: GraphDataChange): void {
        if (graphDataChange.nodePositions) {
            // const stationPositions = { ...this.cachedState.stationPositions };

            this.store.dispatch(new SetStationPositionsAndLayoutSOA({
                stationPositions: this.getNewStationPositions(graphDataChange.nodePositions),
                layout: graphDataChange.layout
            }));
        }
        if (graphDataChange.layout) {
            this.store.dispatch(new SetSchemaGraphLayoutSOA({ layout: graphDataChange.layout }));
        }
        if (graphDataChange.selectedElements) {
            this.store.dispatch(new SetSelectedElementsSOA({
                selectedElements: mapGraphSelectionToFclElementSelection(graphDataChange.selectedElements, this.schemaGraphData)
            }));
        }
    }

    get graphData(): GraphData {
        return this.schemaGraphData;
    }

    get legendInfo(): LegendInfo | null {
        return this.legendInfo_;
    }

    get cyConfig(): CyConfig {
        return this.cyConfig_;
    }

    private applyState(newState: SchemaGraphState) {
        this.sharedGraphData = this.graphService.getData(newState);
        this.schemaGraphData = this.schemaGraphService.getData(newState);
        this.legendInfo_ = this.sharedGraphData.legendInfo;
        this.cachedState = newState;
    }

    private getNewStationPositions(nodePositions: Record<NodeId, Position>): Record<StationId, Position> {
        const newStationPositions: Record<StationId, Position> = { ...this.cachedState.stationPositions };
        for (const node of this.schemaGraphData.nodeData) {
            newStationPositions[node.station.id] = nodePositions[node.id];
        }
        return newStationPositions;
    }
}
