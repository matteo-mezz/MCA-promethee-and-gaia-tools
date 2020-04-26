/*var ProblemeDescription = {
    criteres: [
        { name: "c1", weight: 0.20, deltaWeight: Math.random() * .1, prefFunc: PROMETHEE.getPrefFunction('usual')},
        { name: "c2", weight: 0.54, deltaWeight: Math.random() * .1, prefFunc: PROMETHEE.getPrefFunction('usual')},
        { name: "c3", weight: 0.22, deltaWeight: Math.random() * .1, prefFunc: PROMETHEE.getPrefFunction('usual')},
        { name: "c4", weight: 0.10, deltaWeight: Math.random() * .1, prefFunc: PROMETHEE.getPrefFunction('linear', 5, 15)},
        { name: "c5", weight: 0.80, deltaWeight: Math.random() * .1, prefFunc: PROMETHEE.getPrefFunction('linear', 4, 10)}
    ],
    solutions: [
        { name: "a1", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a2", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a3", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a4", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a5", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a6", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a7", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a8", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}},
        { name: "a9", notes: { "c1" : Math.random() * 20 - 10, "c2": Math.random() * 20 - 10, "c3": Math.random() * 20 - 10, "c4": Math.random() * 20 - 10, "c5": Math.random() * 20 - 10}}
    ]
};

var gaia_plane = new GAIAPlane(ProblemeDescription);
//var promethee2_ranking = gaia_plane.getPrometheeII();

var promethee2_ranking = gaia_plane.getSuperPrometheeII();
gaia_plane.drawSPrometheeII('#PROMETHEEAXIS', promethee2_ranking);


gaia_plane.setCanvas('#GAIAPLANE');
gaia_plane.draw(0.4);
*/

var ProblemeDescription,
    gaia_plane,
    promethee_ranking;

var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: 'javascript',
    indentWithTabs: true,
    //lineWrapping: true,
    lineNumbers: true,
    //styleActiveLine: false,
    //matchBrackets: true
});
editor.setOption('theme', 'dracula');
editor.setSize('33vw', 'auto');

var editor_promethee_result = CodeMirror( document.getElementById('promethee_result'), {
    value: '',
    mode: 'javascript',
    indentWithTabs: true,
    lineWrapping: true,
    lineNumbers: true,
    theme: 'mdn-like',
});
editor_promethee_result.setSize('100%', 'auto');

function getProblemeDescr() { return Function("var MORE = PROMETHEE.CONSTANTES.MORE, LESS = PROMETHEE.CONSTANTES.LESS;"+editor.getValue()+";return ProblemeDescription;")(); }

function autoComplete() {
    var prefdesc = getProblemeDescr();
    var nb_criteres = prefdesc.criteres.length,
        nb_solutions = prefdesc.solutions.length;

    var renames = {};

    // correction des criteres
    var sum_weight = 0;
    for (let j = 0; j < nb_criteres; j++) {
        if (typeof prefdesc.criteres[j] == "number") nb_criteres += (prefdesc.criteres[j] >= 2) ? Math.floor(prefdesc.criteres[j]) - 1: 0;
        if (prefdesc.criteres[j] == null || prefdesc.criteres[j].constructor != Object) prefdesc.criteres[j] = {};

        renames[prefdesc.criteres[j].name || "c"+j] = prefdesc.criteres[j].rn || prefdesc.criteres[j].nname || prefdesc.criteres[j].rename || prefdesc.criteres[j].newname || prefdesc.criteres[j].name || "c"+j;

        prefdesc.criteres[j] = {
            name: prefdesc.criteres[j].name || "c"+j,
            better: (prefdesc.criteres[j].better == PROMETHEE.CONSTANTES.LESS) ? PROMETHEE.CONSTANTES.LESS : PROMETHEE.CONSTANTES.MORE,
            weight: (typeof prefdesc.criteres[j].weight == "number") ? Math.abs(prefdesc.criteres[j].weight) : 0,
            deltaWeight: prefdesc.criteres[j].deltaWeight || 0,
            prefFunc: prefdesc.criteres[j].prefFunc || PROMETHEE.getPrefFunction('usual'),
        };

        sum_weight += prefdesc.criteres[j].weight;
    }

    // normalisation des critères :
    if (sum_weight == 0) for (let j = 0; j < nb_criteres; j++) prefdesc.criteres[j].weight = 1 / nb_criteres;
    else for (let j = 0; j < nb_criteres; j++) {
        prefdesc.criteres[j].weight /= sum_weight;
        prefdesc.criteres[j].deltaWeight /= sum_weight;
    }

    
    // correction des solutions :
    for (let i = 0; i < nb_solutions; i++) {
        if (typeof prefdesc.solutions[i] == "number") nb_solutions += (prefdesc.solutions[i] >= 2) ? Math.floor(prefdesc.solutions[i]) - 1: 0;
        if (prefdesc.solutions[i] == null || prefdesc.solutions[i].constructor != Object) prefdesc.solutions[i] = {};
        let solution = {
            name: prefdesc.solutions[i].name || "a"+i,
            notes: {}
        };
        if (prefdesc.solutions[i].notes == null || prefdesc.solutions[i].notes.constructor != Object) prefdesc.solutions[i].notes = {};
        for (let j = 0; j < nb_criteres; j++)
            solution.notes[renames[prefdesc.criteres[j].name]] = prefdesc.solutions[i].notes[prefdesc.criteres[j].name] || 0;
        prefdesc.solutions[i] = solution;
    }

    // correct names :
    for (let j = 0; j < nb_criteres; j++)
        prefdesc.criteres[j].name = renames[prefdesc.criteres[j].name];

    editor.setValue(jsToTxt(prefdesc));
}

function getPrefDescription(prefFunc) {
    var data = '';
    if (prefFunc.metadata.s != undefined) data = ', ' + prefFunc.metadata.s;
    
    if (prefFunc.metadata.p != undefined) data = ', ' + prefFunc.metadata.p + data;
    else if (data != '') data = ', undefined' + data;

    if (prefFunc.metadata.q != undefined) data = ', ' + prefFunc.metadata.q + data;
    else if (data != '') data = ', undefined' + data;

    return "'"+prefFunc.metadata.name+"'" + data;
}

function jsToTxt(pd) {
    var txt = 'var ProblemeDescription = {',
    nb_criteres = pd.criteres.length,
    nb_solutions = pd.solutions.length;
    txt += '\n  criteres: [';

    // calcules des espaces
    let size = new Array(nb_criteres+1);
    size[0] = { name: 0, weight: 0, deltaWeight: 0 };
    for (let j = 0; j < nb_criteres; j++) {
        size[j+1] = {};

        size[j+1].name = JSON.stringify(pd.criteres[j].name).length;
        size[0].name = Math.max(size[0].name, size[j+1].name);

        size[j+1].weight = JSON.stringify(pd.criteres[j].weight).length;
        size[0].weight = Math.max(size[0].weight, size[j+1].weight);

        size[j+1].deltaWeight = JSON.stringify(pd.criteres[j].deltaWeight).length;
        size[0].deltaWeight = Math.max(size[0].deltaWeight, size[j+1].deltaWeight);
    }

    let criteres = new Array(nb_criteres);
    for (let j = 0; j < nb_criteres; j++)
        criteres[j] = '\n    { name: '+(" ".repeat(size[0].name - size[j+1].name))+JSON.stringify(pd.criteres[j].name)+
        ', better: '+((pd.criteres[j].better == PROMETHEE.CONSTANTES.LESS) ? 'LESS': 'MORE')+
        ', weight: '+(" ".repeat(size[0].weight - size[j+1].weight)) + pd.criteres[j].weight+
        ', deltaWeight: '+ (" ".repeat(size[0].deltaWeight - size[j+1].deltaWeight)) + pd.criteres[j].deltaWeight+
        ', prefFunc: PROMETHEE.getPrefFunction('+getPrefDescription(pd.criteres[j].prefFunc)+') }';
    
    txt += criteres.join(',');
    txt += '\n  ],\n  solutions: [';

    size = new Array(nb_solutions+1);
    size[0] = new Array(nb_criteres+1).fill(0);
    for (let i = 0; i < nb_solutions; i++) {
        size[i+1] = new Array(nb_criteres+1);

        size[i+1][0] = JSON.stringify(pd.solutions[i].name).length;
        size[0][0] = Math.max(size[0][0], size[i+1][0]);

        for (let j = 0; j < nb_criteres; j++) {
            size[i+1][j+1] = JSON.stringify(pd.solutions[i].notes[pd.criteres[j].name]).length;
            size[0][j+1] = Math.max(size[0][j+1], size[i+1][j+1]);
        }

    }

    let solutions = new Array(nb_solutions);
    for (let i = 0; i < nb_solutions; i++) {
        solutions[i] = '\n    { name: '+(" ".repeat(size[0][0] - size[i+1][0]))+JSON.stringify(pd.solutions[i].name)+', notes: { ';
        let notes = new Array(nb_criteres);
        for (let j = 0; j < nb_criteres; j++)
            notes[j] = JSON.stringify(pd.criteres[j].name)+': '+(" ".repeat(size[0][j+1] - size[i+1][j+1]))+pd.solutions[i].notes[pd.criteres[j].name];
        solutions[i] += notes.join(', ') + ' } }';
    }

    txt += solutions.join(',');
    txt += '\n  ]\n};'

    return txt;
}


function launchProblem() {
    ProblemeDescription = getProblemeDescr();
    ProblemeDescription.zoom = 0.4;
    ProblemeDescription.center_x = 0;
    ProblemeDescription.center_y = 0;
    gaia_plane = new GAIAPlane(ProblemeDescription);

    promethee_ranking = gaia_plane.getSuperPrometheeII();
    editor_promethee_result.setValue(JSON.stringify(promethee_ranking));

    gaia_plane.drawSPrometheeII('#PROMETHEEAXIS', promethee_ranking);
    gaia_plane.drawSPrometheeII_data('#PROMETHEESEE', promethee_ranking);
    gaia_plane.setCanvas('#GAIAPLANE');
    gaia_plane.draw(0.4);
    gaia_plane.drawProfiles();

    startSimpleSelector()
}

var weightSelectors = [];

function startSimpleSelector() {
    var nb_criteres = ProblemeDescription.criteres.length;
    var selectors = document.getElementById('sliders');

    // remove old one
    for (let i = 0, nb_old = weightSelectors.length; i < nb_old; i++)
        weightSelectors[i].destroy();
    
    selectors.innerHTML = '';

    var max = 0;
    for (let j = 0, tmp; j < nb_criteres; j++) {
        tmp = Math.abs(ProblemeDescription.criteres[j].weight) + ProblemeDescription.criteres[j].deltaWeight;
        max = (tmp >= max) ? tmp : max;
    }
    var coef = 20 / max;

    // making new
    weightSelectors = new Array(nb_criteres);
    for (let j = 0; j < nb_criteres; j++) {
        let critere = document.createElement('div');
        critere.className = 'critere';
        critere.innerHTML = '<div class="name">'+ProblemeDescription.criteres[j].name+'</div><div><input class="slider"></div>';
        critere.critere_pos = j;
        selectors.appendChild(critere);
        weightSelectors[j] = $(critere.children[1].children[0]).ionRangeSlider({
            type: "double",
            min: 0,
            max: 20,
            from: Math.round(coef * (Math.abs(ProblemeDescription.criteres[j].weight) - ProblemeDescription.criteres[j].deltaWeight)),
            to:   Math.round(coef * (Math.abs(ProblemeDescription.criteres[j].weight) + ProblemeDescription.criteres[j].deltaWeight)),
            step: 1,
            grid: true,

            onChange: function (data) {

                normaliseWeight(coef);

                gaia_plane.calcPrometheeAxis();
                gaia_plane.calcDeltaWeight();

                gaia_plane.draw(0.4);
            },
            onFinish: function (data) {

                normaliseWeight(coef);

                gaia_plane.calcPrometheeAxis();
                gaia_plane.calcDeltaWeight();
                
                promethee_ranking = gaia_plane.getSuperPrometheeII();
                editor_promethee_result.setValue(JSON.stringify(promethee_ranking));

                gaia_plane.drawSPrometheeII('#PROMETHEEAXIS', promethee_ranking);
                gaia_plane.drawSPrometheeII_data('#PROMETHEESEE', promethee_ranking);
                gaia_plane.draw(0.4);
                
                editor.setValue(jsToTxt(ProblemeDescription));
            }
        }).data("ionRangeSlider");
    }
}

function normaliseWeight(coef) {
    var nb_criteres = ProblemeDescription.criteres.length;
    var sum = 0;
    for (let j = 0; j < nb_criteres; j++) {
        ProblemeDescription.criteres[j].deltaWeight = (weightSelectors[j].result.to - weightSelectors[j].result.from) / (2 * coef);
        ProblemeDescription.criteres[j].weight = (weightSelectors[j].result.to + weightSelectors[j].result.from) / (2 * coef);
        sum += Math.abs(ProblemeDescription.criteres[j].weight);
    }
    
    for (let j = 0; j < nb_criteres; j++) {
        ProblemeDescription.criteres[j].weight /= sum;
        ProblemeDescription.criteres[j].deltaWeight /= sum;
    }
}
