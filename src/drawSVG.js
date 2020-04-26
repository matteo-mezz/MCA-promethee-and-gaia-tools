var SVGBASE = {};

var getSVGctx = (function () {
    var ctxs = {};
    return function (id) {
        ctxs[id] = ctxs[id] || SVG().addTo(id);
        return ctxs[id];
    };
})();

var chartColor = [
    ['#b2d4f5', '#93bfeb', '#74abe2', '#5899da', '#367dc4', '#1866b4'], // blue
    ['#fcc3a7', '#f5aa85', '#ef8d5d', '#e8743b', '#da5a1b', '#cc4300'], // orange
    ['#8fd1bb', '#66c2a3', '#3fb68e', '#19a979', '#0e8c62', '#03734d'], // green
    ['#d5dadc', '#bac1c4', '#9ea8ad', '#848f94', '#69767c', '#596468']  // gray
];