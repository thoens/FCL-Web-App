import { AfterViewInit, Component, ElementRef, ViewChild, Input } from '@angular/core';

declare const EditorUi: any;
declare const Editor: any;
declare const mxUtils: any;
declare const mxResources: any;
declare const Graph: any;
declare const RESOURCE_BASE: string;
declare const STYLE_PATH: string;
declare const mxLanguage: string;
declare const OPEN_URL: string;

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'app-graph-editor',
    templateUrl: './graph-editor.component.html'
})
export class GraphEditorComponent implements AfterViewInit {

    @ViewChild('editorContainer') editorContainer: ElementRef;
    @Input() graph: mxGraph;

    ngAfterViewInit() {
        const that = this;
        const graphModel = that.graph ? that.graph.getModel() : null;
        const editorUiInit = EditorUi.prototype.init;

        EditorUi.prototype.init = function () {
            editorUiInit.apply(this, arguments);
            this.actions.get('export').setEnabled(false);
            // Updates action states which require a backend
            if (!Editor.useLocalStorage) {
                this.actions.get('open').setEnabled(true);
                this.actions.get('import').setEnabled(false);
                this.actions.get('save').setEnabled(true);
                this.actions.get('saveAs').setEnabled(true);
                this.actions.get('export').setEnabled(false);
            }
        };

        // Adds required resources (disables loading of fallback properties, this can only
        // be used if we know that all keys are defined in the language specific file)
        mxResources.loadDefaultBundle = false;
        const bundle = mxResources.getDefaultBundle(RESOURCE_BASE, mxLanguage) ||
            mxResources.getSpecialBundle(RESOURCE_BASE, mxLanguage);
        // Fixes possible asynchronous requests
        mxUtils.getAll([bundle, STYLE_PATH + '/default.xml'], function (xhr: any) {
            // Adds bundle text to resources
            mxResources.parse(xhr[0].getText());

            // Configures the default graph theme
            const themes: any = new Object();
            themes[Graph.prototype.defaultThemeName] = xhr[1].getDocumentElement();

            // Main
            const editor = new Editor(false, themes, graphModel);
            // tslint:disable-next-line
            new EditorUi(editor, that.editorContainer.nativeElement);
            if (graphModel) {
                graphModel.endUpdate();
            }
        }, function () {
            document.body.innerHTML =
                '<center style="margin-top:10%;">Error loading resource files. Please check browser console.</center>';
        });

    }

}
