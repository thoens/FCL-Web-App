import { TracingActions, TracingActionTypes } from './tracing.actions';
import { Constants } from '../util/constants';
import {
    FclData,
    TableMode,
    MergeDeliveriesType,
    MapType,
    GraphType,
    FilterSettings,
    ComplexFilterSettings,
    StandardFilterSettings,
    ROASettings
} from '../data.model';
import { VisioReport } from '../visio/layout-engine/datatypes';

export const STATE_SLICE_NAME = 'tracing';

export interface State {
    tracing: TracingState;
}

export interface TracingState {
    fclData: FclData;
    visioReport: VisioReport | null;
    roaSettings: ROASettings;
    showGraphSettings: boolean;
    showConfigurationSideBar: boolean;
    configurationTabIndices: ConfigurationTabIndex;
    showTableSettings: boolean;
    tracingActive: boolean;
}

export interface ConfigurationTabIndex {
    activeMainTabIndex: number;
    activeFilterTabIndex: number;
    activeHighlightingTabIndex: number;
}

export interface SettingOptions {
    graphSettingsOption: string;
    tableSettingsOption: string;
}

const standardFilterSettings: StandardFilterSettings = {
    filterTerm: ''
};

const complexFilterSettings: ComplexFilterSettings = {
    stationColumns: [],
    stationRows: [],
    stationFilterConditions: [],
    reset: false
};

const filterSettings: FilterSettings = {
    standardFilterSettings: standardFilterSettings,
    complexFilterSettings: complexFilterSettings
};

const initialData: FclData = createInitialFclDataState();

const initialTabIndices: ConfigurationTabIndex = {
    activeMainTabIndex: 0,
    activeFilterTabIndex: 0,
    activeHighlightingTabIndex: 0
};

const initialState: TracingState = {
    fclData: initialData,
    roaSettings: createDefaultROASettings(),
    visioReport: null,
    tracingActive: false,
    showConfigurationSideBar: false,
    configurationTabIndices: initialTabIndices,
    showTableSettings: false,
    showGraphSettings: false
};

export function createInitialFclDataState(): FclData {
    return {
        source: null,
        fclElements: {
            stations: [],
            deliveries: [],
            samples: []
        },
        graphSettings: {
            type: Constants.DEFAULT_GRAPH_TYPE,
            nodeSize: Constants.DEFAULT_GRAPH_NODE_SIZE,
            fontSize: Constants.DEFAULT_GRAPH_FONT_SIZE,
            mergeDeliveriesType: MergeDeliveriesType.NO_MERGE,
            showMergedDeliveriesCounts: false,
            skipUnconnectedStations: Constants.DEFAULT_SKIP_UNCONNECTED_STATIONS,
            showLegend: Constants.DEFAULT_GRAPH_SHOW_LEGEND,
            showZoom: Constants.DEFAULT_GRAPH_SHOW_ZOOM,
            selectedElements: {
                stations: [],
                deliveries: []
            },
            stationPositions: {},
            highlightingSettings: {
                invisibleStations: [],
                stations: [],
                deliveries: []
            },
            schemaLayout: null,
            gisLayout: null,
            mapType: Constants.DEFAULT_MAP_TYPE,
            shapeFileData: null,
            ghostStation: null
        },
        tracingSettings: {
            stations: [],
            deliveries: []
        },
        tableSettings: {
            mode: Constants.DEFAULT_TABLE_MODE,
            width: Constants.DEFAULT_TABLE_WIDTH,
            stationColumns: Constants.DEFAULT_TABLE_STATION_COLUMNS.toArray(),
            deliveryColumns: Constants.DEFAULT_TABLE_DELIVERY_COLUMNS.toArray(),
            showType: Constants.DEFAULT_TABLE_SHOW_TYPE
        },
        groupSettings: [],
        filterSettings: filterSettings

    };
}

export function createDefaultROASettings(): ROASettings {
    return {
        labelSettings: {
            stationLabel: [
                [
                    { prop: 'typeOfBusiness', altText: 'Unknown activity' },
                    { text: ': ' },
                    { prop: 'name', altText: 'Unknown FBO' }
                ]
            ],

            lotLabel: [
                [ { prop: 'name', altText: 'Unknown product name' } ],
                [ { text: 'Lot: ' }, { prop: 'lot', altText: 'unknown' } ],
                [ { text: 'Amount: ' }, { prop: 'lotQuantity', altText: 'unknown' } ]
            ],

            stationSampleLabel: [
                [ { prop: 'type', altText: 'Unknown type' } ],
                [ { prop: 'material', altText: 'Unknown material' } ],
                [ { prop: 'amount', altText: 'Unknown amount' } ],
                [ { prop: 'result', altText: 'Unknown result' } ],
                [ { prop: 'time', altText: 'Unknown time' } ]
            ],

            lotSampleLabel: [
                [ { prop: 'type', altText: 'Unknown type' } ],
                [ { prop: 'amount', altText: 'Unknown amount' } ],
                [ { prop: 'result', altText: 'Unknown result' } ],
                [ { prop: 'time', altText: 'Unknown time' } ]
            ]
        }
    };
}

// REDUCER
export function reducer(state: TracingState = initialState, action: TracingActions): TracingState {
    switch (action.type) {
        case TracingActionTypes.TracingActivated:
            return {
                ...state,
                tracingActive: action.payload.isActivated
            };

        case TracingActionTypes.LoadFclDataSuccess:
            action.payload.fclData.graphSettings.mapType = state.fclData.graphSettings.mapType;
            action.payload.fclData.graphSettings.shapeFileData = state.fclData.graphSettings.shapeFileData;

            return {
                ...state,
                fclData: action.payload.fclData
            };

        case TracingActionTypes.LoadFclDataFailure:
            return {
                ...state,
                fclData: initialData
            };

        case TracingActionTypes.GenerateVisioLayoutSuccess:
            return {
                ...state,
                visioReport: action.payload
            };

        case TracingActionTypes.ShowGraphSettingsSOA:
            return {
                ...state,
                showGraphSettings: action.payload.showGraphSettings
            };

        case TracingActionTypes.ShowConfigurationSideBarSOA:
            return {
                ...state,
                showConfigurationSideBar: action.payload.showConfigurationSideBar
            };

        case TracingActionTypes.ShowTableSettingsSOA:
            return {
                ...state,
                showTableSettings: action.payload.showTableSettings
            };

        case TracingActionTypes.SetGraphTypeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        type: action.payload.graphType
                    }
                }
            };

        case TracingActionTypes.SetMapTypeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        type: GraphType.GIS,
                        mapType: action.payload.mapType
                    }
                }
            };

        case TracingActionTypes.LoadShapeFileSuccessSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        type: GraphType.GIS,
                        mapType: MapType.SHAPE_FILE,
                        shapeFileData: action.payload.shapeFileData
                    }
                }
            };

        case TracingActionTypes.SetNodeSizeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        nodeSize: action.payload.nodeSize
                    }
                }
            };

        case TracingActionTypes.SetFontSizeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        fontSize: action.payload.fontSize
                    }
                }
            };

        case TracingActionTypes.SetMergeDeliveriesTypeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        mergeDeliveriesType: action.payload.mergeDeliveriesType
                    }
                }
            };

        case TracingActionTypes.ShowMergedDeliveriesCountsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showMergedDeliveriesCounts: action.payload.showMergedDeliveriesCounts
                    }
                }
            };

        case TracingActionTypes.ShowLegendSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showLegend: action.payload
                    }
                }
            };

        case TracingActionTypes.ShowZoomSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showZoom: action.payload
                    }
                }
            };

        case TracingActionTypes.SetTableModeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tableSettings: {
                        ...state.fclData.tableSettings,
                        mode: action.payload
                    }
                }
            };

        case TracingActionTypes.SetTableColumnsSOA:
            const tableMode = action.payload[0];
            const selections: string[] = action.payload[1];
            const tableSettings = { ...state.fclData.tableSettings };
            if (tableMode === TableMode.STATIONS) {
                tableSettings.stationColumns = selections;
            }
            if (tableMode === TableMode.DELIVERIES) {
                tableSettings.deliveryColumns = selections;
            }

            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tableSettings: tableSettings
                }
            };

        case TracingActionTypes.SetTableShowTypeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tableSettings: {
                        ...state.fclData.tableSettings,
                        showType: action.payload
                    }
                }
            };

        case TracingActionTypes.SetSelectedElementsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        selectedElements: action.payload.selectedElements
                    }
                }
            };

        case TracingActionTypes.SetStationPositionsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        stationPositions: action.payload.stationPositions
                    }
                }
            };
        case TracingActionTypes.SetStationPositionsAndLayoutSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        stationPositions: action.payload.stationPositions,
                        schemaLayout: action.payload.layout
                    }
                }
            };
        case TracingActionTypes.SetSchemaGraphLayoutSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        schemaLayout: action.payload.layout
                    }
                }
            };
        case TracingActionTypes.SetGisGraphLayoutSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        gisLayout: action.payload.layout
                    }
                }
            };
        case TracingActionTypes.SetStationGroupsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    groupSettings: action.payload.groupSettings,
                    tracingSettings: {
                        ...state.fclData.tracingSettings,
                        stations: action.payload.stationTracingSettings
                    },
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        selectedElements: {
                            ...state.fclData.graphSettings.selectedElements,
                            stations: action.payload.selectedStations
                        },
                        highlightingSettings: {
                            ...state.fclData.graphSettings.highlightingSettings,
                            invisibleStations: action.payload.invisibleStations
                        },
                        stationPositions: action.payload.stationPositions
                    }
                }
            };

        case TracingActionTypes.SetTracingSettingsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tracingSettings: action.payload.tracingSettings
                }
            };

        case TracingActionTypes.SetHighlightingSettingsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        highlightingSettings: action.payload.highlightingSettings
                    }
                }
            };

        case TracingActionTypes.ShowGhostStationMSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        ghostStation: action.payload.stationId
                    }
                }
            };

        case TracingActionTypes.ClearGhostStationMSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        ghostStation: null
                    }
                }
            };

        case TracingActionTypes.SetActiveMainTabIndexSSA:
            return {
                ...state,
                configurationTabIndices: {
                    ...state.configurationTabIndices,
                    activeMainTabIndex: action.payload.activeMainTabIndex
                }
            };

        case TracingActionTypes.SetActiveFilterTabIndexSSA:
            return {
                ...state,
                configurationTabIndices: {
                    ...state.configurationTabIndices,
                    activeFilterTabIndex: action.payload.activeFilterTabIndex
                }
            };

        case TracingActionTypes.SetActiveHighlightingTabIndexSSA:
            return {
                ...state,
                configurationTabIndices: {
                    ...state.configurationTabIndices,
                    activeHighlightingTabIndex: action.payload.activeHighlightingTabIndex
                }
            };

        case TracingActionTypes.SetStationColumnsForComplexFilterSSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    filterSettings: {
                        ...state.fclData.filterSettings,
                        complexFilterSettings: {
                            ...state.fclData.filterSettings.complexFilterSettings,
                            stationColumns: action.payload.stationColumns
                        }
                    }
                }
            };

        case TracingActionTypes.SetStationRowsForComplexFilterSSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    filterSettings: {
                        ...state.fclData.filterSettings,
                        complexFilterSettings: {
                            ...state.fclData.filterSettings.complexFilterSettings,
                            stationRows: action.payload.stationRows
                        }
                    }
                }
            };

        case TracingActionTypes.SetStationComplexFilterConditionsSSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    filterSettings: {
                        ...state.fclData.filterSettings,
                        complexFilterSettings: {
                            ...state.fclData.filterSettings.complexFilterSettings,
                            stationFilterConditions: action.payload.stationFilterConditions,
                            reset: action.payload.reset
                        }
                    }
                }
            };

        case TracingActionTypes.ResetStationComplexFilterSSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    filterSettings: {
                        ...state.fclData.filterSettings,
                        complexFilterSettings: {
                            ...state.fclData.filterSettings.complexFilterSettings,
                            reset: true
                        }
                    }
                }
            };

        case TracingActionTypes.SetStationStandardFilterTermSSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    filterSettings: {
                        ...state.fclData.filterSettings,
                        standardFilterSettings: {
                            ...state.fclData.filterSettings.standardFilterSettings,
                            filterTerm: action.payload.filterTerm
                        }
                    }
                }
            };

        case TracingActionTypes.ResetStationStandardFilterSSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    filterSettings: {
                        ...state.fclData.filterSettings,
                        standardFilterSettings: {
                            ...state.fclData.filterSettings.standardFilterSettings,
                            filterTerm: ''
                        }
                    }
                }
            };

        case TracingActionTypes.SetROAReportSettingsSOA:
            return {
                ...state,
                roaSettings: action.payload.roaSettings
            };

        default:
            return state;
    }
}
