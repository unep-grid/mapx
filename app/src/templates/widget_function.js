/**
 * Add functions to handle dashboard events
 *
 * Some modules ar loadable from mapx core. Full list here:
 * > https://github.com/unep-grid/map-x-mgl/blob/master/app/src/js/modules_loader_async/index.js ;
 *
 * -- d3
 * const d3 = await h.moduleLoad('d3');
 * const body = d3.select('body');
 *
 * -- csvjson
 * const csvjson = await h.moduleLoad('csvjson');
 * const data = csvjson.toObject("a,b\n1,2\n1,2");
 *
 * -- highcharts ( from dashboard modules )
 * const hc = windget.modules('highcharts');
 */
return {
    /**
     * 
     * Callback called once when the widget is added
     *  
     */
    onAdd: async function(widget) {
        /*
         * Prepare data
         */
        const h = mx.helpers; // Reference to mapx helpers.
        const s = h.svg; // build svg in javascript
        const csvjson = await h.moduleLoad('csvjson'); // Load module CSV
        const data = csvjson.toObject('key,value\nhello,10') // Parse CSV;
        const item = data[0];

        /**
         * Build simple SVG
         */
        const W = widget.width;
        const H = widget.height;

        const svg = s('svg', {
            width: W,
            height: H,
            viewBox: `0 0  ${W} ${H}`
        });

        const circle = s(
            'circle', {
                cx: W / 2,
                cy: H / 2,
                r: item.value,
                style: {
                    fill: 'var(--mx_ui_background_contrast)',
                    stroke: 'var(--mx_ui_border)',
                    strokeWidth: '2px'
                }
            },
            s('animate', {
                attributeName: 'r',
                values: `${item.value};${W};${item.value}`,
                repeatCount: 'indefinite',
                dur: '2s'
            })
        );
        const txt = s(
            'text', {
                x: W / 2,
                y: H / 2,
                'dominant-baseline': 'middle',
                'text-anchor': 'middle',
                style: {
                    fill: 'var(--mx_ui_text)'
                }
            },
            item.key
        );

        /**
         * Append nodes
         */
        svg.appendChild(circle);
        svg.appendChild(txt);
        widget.elContent.appendChild(svg);

        /**
         * references
         */
        widget._txt = txt // keep ref for text update;
        widget._svg = svg // kep ref for SVG update;
    },
    /**
     * 
     * Callback called once when the widget is removed or errored
     *  
     */
    onRemove: function(widget) {
        widget._svg.remove();
        console.log('removed');
    },
    /**
     * 
     * Callback called each time data is received
     * 
     */
    onData: function(widget, data) {
        /**
         * Do something with the data:
         * - Update sizes, text, etc...
         */
        console.log('data received', data);
        widget._txt.textContent = 'data!'
    }
};

