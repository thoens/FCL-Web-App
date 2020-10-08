import { Layout, Position, Size, Range, PositionMap } from '../../data.model';
import { StyleConfig } from '../components/graph-view/cy-style';
import { getEnclosingRectFromPoints } from '@app/tracing/util/geometry-utils';
import { getDenovoFitLayout } from './denovo-fit-layout-computation';
import { GraphDataChange, InteractiveCyGraph } from './interactive-cy-graph';
import { createLayoutConfigFromLayout, GraphData, CyConfig } from '../components/graph-view/cy-graph';
import { addCustomZoomAdapter } from './cy-adapter';
import { getActivePositions, getAvailableSpace, getZoomedGraphData, getZoomedNodePositions } from './virtual-zoom-utils';
import { CY_MAX_ZOOM, CY_MIN_ZOOM } from './cy.constants';

// export interface Options extends CyConfig {
//     defaultLayout?: Layout;
// }

const DEFAULT_LAYOUT = {
    zoom: 1,
    pan: {
        x: 0,
        y: 0
    }
};

function correctZoomLimit(zoomLimit: number): number {
    return Math.min(CY_MAX_ZOOM, Math.max(CY_MIN_ZOOM, zoomLimit));
}

export class VirtualZoomCyGraph extends InteractiveCyGraph {

    private static readonly ZOOM_FIT_MARGIN = 10;

    private cachedGraphData: GraphData;
    private zoomLimits: Range;

    constructor(
        htmlContainerElement: HTMLElement,
        graphData: GraphData,
        styleConfig: StyleConfig,
        cyConfig?: CyConfig
    ) {
        // console.log('VirtualZoomCyGraph entered ...');
        const fitLayout = !graphData.layout;
        cyConfig = cyConfig || {};
        // const defaultLayout = options.defaultLayout || DEFAULT_LAYOUT;
        const zoomLimits = {
            min: cyConfig.minZoom === undefined ? VirtualZoomCyGraph.DEFAULT_MIN_ZOOM : correctZoomLimit(cyConfig.minZoom),
            max: cyConfig.maxZoom === undefined ? VirtualZoomCyGraph.DEFAULT_MAX_ZOOM : correctZoomLimit(cyConfig.maxZoom)
        };

        if (!graphData.layout) {
            const availableSpace = getAvailableSpace(htmlContainerElement);

            graphData = {
                ...graphData,
                layout: getDenovoFitLayout(
                    getActivePositions(graphData),
                    availableSpace,
                    zoomLimits,
                    DEFAULT_LAYOUT
                    // defaultLayout
                )
            };
        }

        const layoutConfig = createLayoutConfigFromLayout(graphData.layout);
        layoutConfig.fit = false;

        super(
            htmlContainerElement,
            getZoomedGraphData(graphData),
            styleConfig,
            null,
            {
                ...cyConfig,
                zoomingEnabled: false,
                minZoom: 1,
                maxZoom: 1
            }
        );
        this.cachedGraphData = graphData;
        this.zoomLimits = zoomLimits;
        if (fitLayout) {
            this.fitZoomFromCurrentLayout();
        }
        if (this.cy.container()) {
            addCustomZoomAdapter(this.cy, () => this.zoom, (zoom, position) => this.zoomTo(zoom, position));
        }
        // console.log('VirtualZoomCyGraph leaving ...');
    }

    protected getAvailableSpace(): Size {
        return {
            width: this.cy.width(),
            height: this.cy.height()
        };
    }

    get zoom(): number {
        return this.cachedGraphData.layout.zoom;
    }

    get minZoom(): number {
        return this.zoomLimits.min;
    }

    get maxZoom(): number {
        return this.zoomLimits.max;
    }

    get data(): GraphData {
        return this.cachedGraphData;
    }

    get nodePositions(): PositionMap {
        return this.cachedGraphData.nodePositions;
    }

    get layout(): Layout {
        return this.cachedGraphData.layout;
    }

    private setLayout(layout: Layout): void {
        // console.log('VirtualZoomCyGraph.setLayout entered ...');
        const oldZoom = this.zoom;

        this.cachedGraphData = {
            ...this.cachedGraphData,
            layout: layout
        };

        const zoomedGraphData: GraphData = {
            ...this.cachedGraphData,
            layout: {
                zoom: 1,
                pan: layout.pan
            },
            nodePositions:
                layout.zoom === oldZoom ? super.nodePositions :
                this.cachedGraphData.nodePositions !== undefined ? getZoomedNodePositions(
                    this.cachedGraphData.nodeData,
                    this.cachedGraphData.nodePositions,
                    layout.zoom
                ) :
                super.nodePositions
        };

        super.updateGraph(zoomedGraphData, this.style);
        // console.log('VirtualZoomCyGraph.setLayout leaving ...');
    }

    private fitZoomFromCurrentLayout(): void {
        // console.log('VirtualZoomCyGraph.fitZoomFromCurrentLayout entered ...');

        if (this.cachedGraphData.nodeData.length > 0) {

            const rendNodePosEnclosingBBox = getEnclosingRectFromPoints(
                getActivePositions(this.cachedGraphData)
                    .map(p => ({ x: p.x * this.zoom + this.pan.x, y: p.y * this.zoom + this.pan.y }))
            );

            const availableSpace = this.getAvailableSpace();

            // reset the layout so that the rendered graph fits and is centered
            const graphBBox = this.cy.elements().renderedBoundingBox();

            const margin = {
                left: rendNodePosEnclosingBBox.left - graphBBox.x1,
                right: graphBBox.x2 - rendNodePosEnclosingBBox.right,
                top: rendNodePosEnclosingBBox.top - graphBBox.y1,
                bottom: graphBBox.y2 - rendNodePosEnclosingBBox.bottom
            };
            const hMargin = margin.left + margin.right;
            const vMargin = margin.top + margin.bottom;

            const newZoom = this.getNextFeasibleZoom(
                Math.min(
                    (availableSpace.width - hMargin) / (graphBBox.w - hMargin + 2 * VirtualZoomCyGraph.ZOOM_FIT_MARGIN),
                    (availableSpace.height - vMargin) / (graphBBox.h - vMargin + 2 * VirtualZoomCyGraph.ZOOM_FIT_MARGIN)
                ) * this.zoom
            );

            const renderedNodePosCenter = {
                x: (rendNodePosEnclosingBBox.left + rendNodePosEnclosingBBox.right) / 2,
                y: (rendNodePosEnclosingBBox.top + rendNodePosEnclosingBBox.bottom) / 2
            };

            const avSpaceWoMarginsCenter = {
                x: (margin.left + availableSpace.width - margin.right) / 2,
                y: (margin.top + availableSpace.height - margin.bottom) / 2
            };

            const modelGraphCenter = {
                x: (renderedNodePosCenter.x - this.pan.x) / this.zoom,
                y: (renderedNodePosCenter.y - this.pan.y) / this.zoom
            };

            const newPan = {
                x: avSpaceWoMarginsCenter.x - modelGraphCenter.x * newZoom,
                y: avSpaceWoMarginsCenter.y - modelGraphCenter.y * newZoom
            };

            const newLayout = {
                zoom: newZoom,
                pan: newPan
            };

            this.setLayout(newLayout);
        }
        // console.log('VirtualZoomCyGraph.fitZoomFromCurrentLayout leaving ...');
    }

    zoomFit(): void {
        // console.log('VirtualZoomCyGraph.zoomFit entered ...');

        if (this.cachedGraphData.nodeData.length > 0) {

            const availableSpace = this.getAvailableSpace();

            // Approximate initial layout based on node positions only
            // The Approximation is used as first upper bound on a fitting zoom
            const posBasedFitLayout = getDenovoFitLayout(
                getActivePositions(this.cachedGraphData),
                availableSpace,
                { min: this.minZoom, max: this.maxZoom },
                { ...this.cachedGraphData.layout }
            );
            posBasedFitLayout.zoom = this.getNextFeasibleZoom(posBasedFitLayout.zoom);

            const graphBB = this.cy.elements().renderedBoundingBox();

            if (
                posBasedFitLayout.zoom < this.zoom || // to much zoomed in
                (
                    graphBB.w < availableSpace.width &&
                    graphBB.h < availableSpace.height // o much zoomed out
                )
            ) {
                // the current layout is not sufficient for layout prediction
                // apply the position based layout
                this.setLayout(posBasedFitLayout);
            }

            // the layout will be fitted based on the rendered graph
            this.fitZoomFromCurrentLayout();

            this.onLayoutChanged();
        }
        // console.log('VirtualZoomCyGraph.zoomFit leaving ...');
    }

    protected zoomTo(zoom: number, position?: Position): void {
        // console.log('VirtualZoomCyGraph.zoomTo entered ...');

        const oldZoom = this.zoom;
        const oldPan = this.pan;
        const newZoom = this.getNextFeasibleZoom(zoom);

        position = position ? position : { x: this.cy.width() / 2, y: this.cy.height() / 2 };

        const newPan = {
            x: position.x - ((position.x - oldPan.x) * newZoom) / oldZoom,
            y: position.y - ((position.y - oldPan.y) * newZoom) / oldZoom
        };

        if (newZoom !== this.zoom || newPan.x !== oldPan.x || newPan.y !== oldPan.y) {
            this.setLayout({ zoom: newZoom, pan: newPan });

            this.onLayoutChanged();
            // console.log('VirtualZoomCyGraph.zoomTo leaving ...');
        }
    }

    updateGraph(graphData: GraphData, styleConfig: StyleConfig): void {
        // console.log('VirtualZoomCyGraph.updateGraph entered ...');
        const oldGraphData = this.cachedGraphData;
        this.cachedGraphData = graphData;
        if (
            graphData.nodePositions !== oldGraphData.nodePositions ||
            graphData.layout.zoom !== oldGraphData.layout.zoom
        ) {
            // console.log('VirtualZoomCyGraph.updateGraph - nodePos or layout changed');
            super.updateGraph(getZoomedGraphData(graphData), styleConfig);
        } else {
            // console.log('VirtualZoomCyGraph.updateGraph - calling super method');
            super.updateGraph({
                ...graphData,
                nodePositions: super.nodePositions,
                layout: {
                    zoom: 1,
                    pan: graphData.layout.pan
                }
            }, styleConfig);
        }
        // console.log('VirtualZoomCyGraph.updateGraph leaving ...');
        // setTimeout(() => console.log('VirtualZoomCyGraph.updateGraph async finished'), 0);
    }

    protected applyGraphDataChangeBottomUp(graphDataChange: GraphDataChange): void {
        // console.log('VirtualZoomCyGraph.applyGraphDataChangeBottomUp entered ...');
        super.applyGraphDataChangeBottomUp(graphDataChange);
        this.cachedGraphData = { ...this.cachedGraphData };
        if (graphDataChange.layout) {
            this.cachedGraphData.layout = {
                zoom: this.cachedGraphData.layout.zoom,
                pan: super.pan
            };
        }
        if (graphDataChange.nodePositions) {
            this.cachedGraphData.nodePositions = getZoomedNodePositions(this.data.nodeData, super.nodePositions, 1 / this.zoom);
        }
        if (graphDataChange.selectedElements) {
            this.cachedGraphData.selectedElements = super.selectedElements;
        }
        // console.log('VirtualZoomCyGraph.applyGraphDataChangeBottomUp leaving ...');

    }
}
