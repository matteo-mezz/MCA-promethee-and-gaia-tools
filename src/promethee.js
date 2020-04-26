var PROMETHEE = {};

PROMETHEE.getPrefFunction = function (name, q, p, s) {
    var finalFunc = null;
    switch (name) {
        case 'usual':    finalFunc = (d) => (d <= 0) ? 0 : 1; break;
        case 'u-shape':  finalFunc = (d) => (d <= q) ? 0 : 1; break;
        case 'v-shape':  finalFunc = (d) => (d <= 0) ? 0 : (d <= q) ? d / q : 1; break;
        case 'level':    finalFunc = (d) => (d <= q) ? 0 : (d <= p) ? .5 : 1; break;
        case 'linear':   finalFunc = (d) => (d <= q) ? 0 : (d <= p) ? (d - q) / (p - q) : 1; break;
        case 'gaussian': finalFunc = (d) => (d <= 0) ? 0 : 1 - Math.exp(- (d * d) / (2 * s * s)); break;
    }
    finalFunc.metadata = {
        name: name,
        q: q,
        p: p,
        s: s
    };
    return finalFunc;
};

PROMETHEE.CONSTANTES = {};
PROMETHEE.CONSTANTES.LESS = -1;
PROMETHEE.CONSTANTES.MORE = 1;

/**
 * créer une matrice G[i][j] contenant les notes de la solution A_i sur le critère I_j
 * @param {Object} problem_descr : description du probleme
 */
PROMETHEE.createPerfMatrix = function (problem_descr) {
    var nb_solutions = problem_descr.solutions.length,
        nb_criteres = problem_descr.criteres.length;

    var mat = new Array(nb_solutions);

    for (let i = 0; i < nb_solutions; i++) {
        mat[i] = new Array(nb_criteres);

        for (let j = 0; j < nb_criteres; j++)
            mat[i][j] = problem_descr.solutions[i].notes[problem_descr.criteres[j].name];
    }

    return mat;
};


/**
 * création de la matrice contenant les vecteurs des solutions
 * @param {Array} perfMatrix : matrice retourné par PROMETHEE.createPerfMatrix
 */
PROMETHEE.createMPS = function (problem_descr) {
    var nb_criteres = problem_descr.criteres.length,
        nb_solutions = problem_descr.solutions.length;

    var mat = new Array(nb_solutions);

    for (let i = 0; i < nb_solutions; i++) {
        mat[i] = new Array(nb_criteres);


        let a = problem_descr.solutions[i];

        for (let j = 0; j < nb_criteres; j++) {
            mat[i][j] = 0;

            let critere = problem_descr.criteres[j];

            for (let k = 0; k < nb_solutions; k++) {
                if (k != i) {
                    let x = problem_descr.solutions[k];
                    let d = a.notes[critere.name] - x.notes[critere.name];
                    mat[i][j] += critere.prefFunc(d) - critere.prefFunc(-d);
                }
            }

            mat[i][j] /= nb_solutions - 1;

            // on renverse la note s'il s'agit d'un critère à miniser
            mat[i][j] *= problem_descr.criteres[j].better;
        }
    }

    return mat;
};


var GAIAPlane = function (problem_descr) {
    this.problem_descr = problem_descr;

    // calcules des résultats du plan GAIA
    this.mps = PROMETHEE.createMPS(problem_descr);

    // calcules des axes du plan gaia
    this.axe_x;
    this.axe_y;
    this.calcAxis();

    this.promethee_axis;
    this.calcPrometheeAxis();

    this.deltaWeight;
    this.calcDeltaWeight();

    this.drawParams = {
        origine: true,
        solutions: true,
        criteres: true,
        promethee: true,
        brain: true
    };
};

GAIAPlane.prototype.calcAxis = function () {
    var eigenVectors = PCA.getEigenVectors(this.mps);
    this.axe_x = eigenVectors[0].vector;
    this.axe_y = eigenVectors[1].vector;
};

GAIAPlane.prototype.actualiseSolutions = function () {
    this.mps = PROMETHEE.createMPS(this.problem_descr);
    this.calcAxis();
};

GAIAPlane.prototype.calcPrometheeAxis = function () {
    var nb_criteres = this.problem_descr.criteres.length;
    this.promethee_axis = new Array(nb_criteres);
    for (let j = 0; j < nb_criteres; j++)
        this.promethee_axis[j] = this.problem_descr.criteres[j].weight;

    // on normalise le vecteur (normalisation manhattan (somme des poids = 1))
    this.promethee_axis = Vector.setManhattanNorm(this.promethee_axis, 1);
};


GAIAPlane.prototype.calcDeltaWeight = function () {
    var nb_criteres = this.problem_descr.criteres.length;
    this.deltaWeight = new Array(nb_criteres);
    for (let j = 0; j < nb_criteres; j++)
        this.deltaWeight[j] = this.problem_descr.criteres[j].deltaWeight;
};

GAIAPlane.prototype.getPrometheeII = function () {
    var nb_solutions = this.problem_descr.solutions.length;
    var solutions = new Array(nb_solutions);

    // hydrate
    for (let i = 0; i < nb_solutions; i++)
        solutions[i] = {
            name: this.problem_descr.solutions[i].name,
            notes: this.problem_descr.solutions[i].notes,
            performances: this.mps[i],
            globalPerf: Vector.scalarProduct(this.promethee_axis, this.mps[i]),
            rank: 0
        };

    // sort, tri de la meilleur à la moins bonne
    solutions.sort((a, b) => b.globalPerf - a.globalPerf);

    // set rank
    for (let i = 0; i < nb_solutions; i++)
        solutions[i].rank = i + 1;

    return solutions;
};

GAIAPlane.prototype.projectPoint = function (point) {
    return {
        x: Vector.scalarProduct(this.axe_x, point),
        y: Vector.scalarProduct(this.axe_y, point)
    };
};

GAIAPlane.prototype.projectDeltaWeightOn = function (vector) {
    // cette fonction est utiliser pour créer HB
    // comme l'hyper ovoide qui représente le delta est parfaitement placé sur les axes. (ces extremums se trouvent sur les axes) en changeant les dimensions du repères on peut le transformer en une sphere de rayon 2

    var nb_dimension = vector.length;
    var vector_deforme = new Array(nb_dimension);

    // On déforme l'espace pour transformer l'ovoide DeltaWeight en une sphere parfaite
    for (let i = 0; i < nb_dimension; i++)
        vector_deforme[i] = vector[i] / (this.deltaWeight[i] || 0.001); // on evite les cas avec les 0.

    // On projete la sphère DeltaWeitgh (sont diamètre est automatiquement de deux à cause de la déformation de l'espace)
    vector_deforme = Vector.setNorm(vector_deforme, 2);

    // On reforme l'espace
    for (let i = 0; i < nb_dimension; i++)
        vector_deforme[i] = vector_deforme[i] * this.deltaWeight[i];

    var res = Vector.getNorm(vector_deforme);

    //console.log(res, Vector.scalarProduct(vector, this.deltaWeight)/Vector.getNorm(vector));

    return res;
};


GAIAPlane.prototype.__squizeSpace = function (vector) {
    var nb_dimension = vector.length;
    var vector_deforme = new Array(nb_dimension);

    // On déforme l'espace pour transformer l'ovoide DeltaWeight en une sphere parfaite
    for (let i = 0; i < nb_dimension; i++)
        vector_deforme[i] = vector[i] / (this.deltaWeight[i] || 0.0000001); // on evite les cas avec les 0.

    return vector_deforme;
};
GAIAPlane.prototype.__unsquizeSpace = function (vector) {
    var nb_dimension = vector.length;
    var vector_deforme = new Array(nb_dimension);
    for (let i = 0; i < nb_dimension; i++)
        vector_deforme[i] = vector[i] * (this.deltaWeight[i] || 0.0000001); // on evite les cas avec les 0.
    
    return vector_deforme;
};

GAIAPlane.prototype.getSuperPrometheeII = function () {
    var nb_solutions = this.problem_descr.solutions.length;
    var solutions = new Array(nb_solutions);

    // vecteur w représenté dans l'espace déformé
    var w_vector = this.__squizeSpace(this.promethee_axis);
    var norm_w = Vector.getNorm(w_vector);
    
    var norm_c = Math.sqrt(norm_w * norm_w - 1);

    // omega est l'angle entre c et w.
    var cosOmega = norm_c / norm_w;
    var sinOmega = 1 / norm_w;

    // hydrate
    for (let i = 0, c1, c2, scalaire_ac1, scalaire_ac2, scalaire_aw, a, norm_a, a_scalair_w, u, norm_u, sinTeta, cosTeta, Teta, cosPhi, sinPhi; i < nb_solutions; i++) {

        // on note c1 et c2 les vecteurs représentant les deux potentiels bornes.
        // on se place dans l'espace déformé pour trouver c1 et c2. On profite du fait que dans cette espace deltaWeight est une hyper sphere et ça projection est donc un cercle.
        // on se place dans le plan passant par w et a.

        // calcule de la note de la solution
        scalaire_aw = Vector.scalarProduct(this.mps[i], this.promethee_axis); // promethee_axis est déjà normalisé

        if (Math.max(...this.mps[i]) == 0 && Math.max(...this.mps[i]) == 0) {
            solutions[i] = {
                name: this.problem_descr.solutions[i].name,
                globalPerf: scalaire_aw,
                deltaPerf: [ 0, 0 ],
                rank: 0
            };
            continue;
        } 

        a = this.__squizeSpace(this.mps[i]);
        norm_a = Vector.getNorm(a);
        a_scalair_w = Vector.scalarProduct(a, w_vector);

        // teta est l'angle entre a et w.
        cosTeta = a_scalair_w / (norm_a * norm_w);
        sinTeta = Math.sin(Math.acos(cosTeta));

        // calcule du second axe du plan :
        u = Vector.calcALinear(1, w_vector, -a_scalair_w/(norm_a * norm_a), a);
        norm_u = Vector.getNorm(u);

        // calcules de vecteurs extremums
        // c1
        cosPhi = cosTeta * cosOmega - sinTeta * sinOmega;
        sinPhi = sinTeta * cosOmega + cosTeta * sinOmega;
        c1 = Vector.calcALinear(norm_c * cosPhi / norm_a, a, norm_c * sinPhi / norm_u, u);

        // c2
        cosPhi = cosTeta * cosOmega + sinTeta * sinOmega;
        sinPhi = sinTeta * cosOmega - cosTeta * sinOmega;
        c2 = Vector.calcALinear(norm_c * cosPhi / norm_a, a, norm_c * sinPhi / norm_u, u);



        // reforme l'espace et mise normalisation
        c1 = Vector.setManhattanNorm(this.__unsquizeSpace(c1), 1);
        c2 = Vector.setManhattanNorm(this.__unsquizeSpace(c2), 1);

        c1_isout = (Math.min(...c1) < 0);
        c2_isout = (Math.min(...c2) < 0);

        if (c1_isout && c2_isout) {
            console.log("cas impossible est arrivé...");
        } else if (c1_isout) {
            // c1 possède des valeurs négatives mais pas c2
            let min_alpha = Infinity, alpha; // on recherche le alpha minimal sachant que alpha doit être superieur à 0.
            for (let i = 0; i < nb_criteres; i++) {
                if (0 < c2[i] && c2[i] < this.promethee_axis[i]) {
                    alpha = c2[i] / (this.promethee_axis[i] - c2[i]);
                    if (alpha < min_alpha) min_alpha = alpha;
                }
            }
            // on calcule c1
            c1 = Vector.calcALinear(min_alpha, this.promethee_axis, 1 - min_alpha, c2);
        } else if (c2_isout) {
            // c2 possède des valeurs négatives mais pas c1
            let min_alpha = Infinity, alpha; // on recherche le alpha minimal sachant que alpha doit être superieur à 0.
            for (let i = 0; i < nb_criteres; i++) {
                if (0 < c1[i] && c1[i] < this.promethee_axis[i]) {
                    alpha = c1[i] / (this.promethee_axis[i] - c1[i]);
                    if (alpha < min_alpha) min_alpha = alpha;
                }
            }
            // on calcule c2
            c2 = Vector.calcALinear(min_alpha, this.promethee_axis, 1 - min_alpha, c1);
        }
        
        // calcule des scalaires :
        scalaire_ac1 = Vector.scalarProduct(this.mps[i], c1);
        scalaire_ac2 = Vector.scalarProduct(this.mps[i], c2);

        
        solutions[i] = {
            name: this.problem_descr.solutions[i].name,
            globalPerf: scalaire_aw,
            deltaPerf: [ Math.min(scalaire_ac1, scalaire_ac2), Math.max(scalaire_ac1, scalaire_ac2) ],
            rank: 0
        };
    }

    // tri de la meilleur à la moins bonne note:
    solutions.sort((a, b) => b.globalPerf - a.globalPerf);

    // set rank
    for (let i = 0; i < nb_solutions; i++)
        solutions[i].rank = i + 1;
    
    return solutions;

};


GAIAPlane.prototype.setCanvas = function (id) {
    this.svgrenderer = getSVGctx(id).size('100%', '100%');
};

GAIAPlane.prototype.drawSPrometheeII = function (id, promethee_result, zoom = 1) {
    var svgrenderer = getSVGctx(id).size('100%', '100%').clear();
    var nb_solutions = promethee_result.length;

    var width = svgrenderer.node.parentElement.offsetWidth,
        height = svgrenderer.node.parentElement.offsetHeight;

    // draw axis
    svgrenderer.line(.05 * width, .5 * height, .95 * width, .5 * height).stroke({ color: chartColor[3][5], width: 2 })
    .marker('end', 10, 10, function (add) {
        add.polygon('0,3 5,5 0,7').fill(chartColor[3][5]);
    });

    var minX = promethee_result[nb_solutions - 1].globalPerf,
        maxX = promethee_result[0].globalPerf;
    var centerX = (minX + maxX) / 2;

    // affichage des incertitudes et des noms
    var objs = {};
    for (let i = 0; i < nb_solutions; i++) {
        let x = .5 * width + .4 * width * zoom * (promethee_result[i].globalPerf - centerX) / (maxX - centerX);
        //let deltaPerf = .8 * width * promethee_result[i].deltaPerf / (maxX - centerX);
        let deltaPerf = [
            .5 * width + .4 * width * zoom * (promethee_result[i].deltaPerf[0] - centerX) / (maxX - centerX),
            .5 * width + .4 * width * zoom * (promethee_result[i].deltaPerf[1] - centerX) / (maxX - centerX)
        ];

        let delta = svgrenderer.rect( deltaPerf[1] - deltaPerf[0], 10 )
        .fill(chartColor[1][1]+'aa')
        .center( (deltaPerf[1] + deltaPerf[0]) / 2, .5 * height );
        
        let name = svgrenderer.text(promethee_result[i].name)
        .fill(chartColor[1][3]+'44')
        .center( x, .5 * height + 20 );

        objs[promethee_result[i].name] = {
            x: x,
            deltaPerf: deltaPerf,
            delta: delta,
            name: name
        };
    }

    // affichage des solutions et de leurs incertitudes :
    for (let i = 0; i < nb_solutions; i++) {
        let x = .5 * width + .4 * width * zoom * (promethee_result[i].globalPerf - centerX) / (maxX - centerX);
        let deltaPerf = [
            .5 * width + .4 * width * zoom * (promethee_result[i].deltaPerf[0] - centerX) / (maxX - centerX),
            .5 * width + .4 * width * zoom * (promethee_result[i].deltaPerf[1] - centerX) / (maxX - centerX)
        ];

        let point = svgrenderer.circle(10)
        .fill(chartColor[1][3])
        .center( x, .5 * height );

        point.myname = promethee_result[i].name;

        point.on('mouseover', function () {
            objs[this.myname].name.fill(chartColor[1][3]);
            objs[this.myname].delta.size( deltaPerf[1] - deltaPerf[0], 20);
            objs[this.myname].delta.center( (deltaPerf[1] + deltaPerf[0]) / 2, .5 * height);
        })
        .on('mouseout', function () {
            objs[this.myname].name.fill(chartColor[1][1]+'44');
            objs[this.myname].delta.size( deltaPerf[1] - deltaPerf[0], 10);
            objs[this.myname].delta.center((deltaPerf[1] + deltaPerf[0]) / 2, .5 * height);
        });
    }


};

GAIAPlane.prototype.drawSPrometheeII_data = function (id, promethee_result) {
    var nb_solutions = promethee_result.length;
    var svgrenderer = getSVGctx(id).size('100%', (nb_solutions + 1) * 25).clear();

    var width = svgrenderer.node.parentElement.offsetWidth,
        height = svgrenderer.node.parentElement.offsetHeight;

    var minX = promethee_result[nb_solutions - 1].globalPerf,
        maxX = promethee_result[0].globalPerf;
    var centerX = (minX + maxX) / 2;

    for (let i = 0; i < nb_solutions; i++) {
        let x = .5 * width + .4 * width * (promethee_result[i].globalPerf - centerX) / (maxX - centerX);
        let y = (i + 1.5) * 25;
        let deltaPerf = [
            .5 * width + .4 * width * (promethee_result[i].deltaPerf[0] - centerX) / (maxX - centerX),
            .5 * width + .4 * width * (promethee_result[i].deltaPerf[1] - centerX) / (maxX - centerX)
        ];
        
        // dessins ligne de support
        svgrenderer.line(.05 * width, y, .95 * width, y).stroke({ color: chartColor[3][1], width: 1 });

        // dessins de l'incertitude
        svgrenderer.line(deltaPerf[0], y, deltaPerf[1], y).stroke({ color: chartColor[2][3], width: 2 }).marker('start', 2, 4, function (add) {
            add.line(0, 0, 0, 4).stroke({ color: chartColor[2][3], width: 2 });
        }).marker('end', 2, 4, function (add) {
            add.line(0, 0, 0, 4).stroke({ color: chartColor[2][3], width: 2 });
        });

        // nom de la solutions
        svgrenderer.text(promethee_result[i].name)
        .fill(chartColor[2][3])
        .center( x, (i + 1) * 25 );

    
    }
};

GAIAPlane.prototype.draw = function (zoom = 0.7) {
    var nb_criteres = this.problem_descr.criteres.length,
        nb_solutions = this.problem_descr.solutions.length;

    var width = this.svgrenderer.node.parentElement.offsetWidth,
        height = this.svgrenderer.node.parentElement.offsetHeight;

    var center_x = .5 * width,
        center_y = .5 * height;
    
    zoom *= Math.min(width, height);

    this.svgrenderer.clear();

    // draw origine :
    if (this.drawParams.origine)
        this.svgrenderer.circle(10)
        .fill(chartColor[3][5])
        .center(center_x, center_y);

    if (this.drawParams.criteres) this.__drawCriteres(nb_solutions, nb_criteres, width, height, center_x, center_y, zoom);

    if (this.drawParams.solutions) this.__drawSolutions(nb_solutions, nb_criteres, width, height, center_x, center_y, zoom);

    // calcul de la projection de l'axe promethee
    let projectionPA = this.projectPoint(this.promethee_axis);

    if (this.drawParams.brain) this.__drawBrain(nb_solutions, nb_criteres, width, height, center_x, center_y, zoom, projectionPA);

    if (this.drawParams.promethee) this.__drawPromethee_axis(nb_solutions, nb_criteres, width, height, center_x, center_y, zoom, projectionPA);
};

GAIAPlane.prototype.__drawSolutions = function (nb_solutions, nb_criteres, width, height, center_x, center_y, zoom) {
    // calcule de la projection des solutions :
    var solutions_coords = new Array(nb_solutions);
    var max_x = 0, max_y = 0, min_x = 0, min_y = 0;

    for (let i = 0; i < nb_solutions; i++) {
        solutions_coords[i] = this.projectPoint(this.mps[i]);

        if (solutions_coords[i].x > max_x) max_x = solutions_coords[i].x;
        else if (solutions_coords[i].x < min_x) min_x = solutions_coords[i].x;

        if (solutions_coords[i].y > max_y) max_y = solutions_coords[i].y;
        else if (solutions_coords[i].y < min_y) min_y = solutions_coords[i].y;
    }

    // affichage des solutions :
    for (let i = 0; i < nb_solutions; i++) {
        let num_sol = i;
        let nameObj = this.svgrenderer.text(this.problem_descr.solutions[i].name).fill('#ffffff00').center(
            center_x + zoom * solutions_coords[i].x,
            center_y - zoom * solutions_coords[i].y - 20
        );

        this.svgrenderer.circle(15)
        .fill(chartColor[1][3])
        .center(
            center_x + zoom * solutions_coords[i].x,
            center_y - zoom * solutions_coords[i].y
        ).on('mouseover', function () {
            nameObj.fill(chartColor[1][3]);
        }).on('mouseout', function () {
            nameObj.fill('#ffffff00');
        });
    }
};
GAIAPlane.prototype.__drawCriteres = function (nb_solutions, nb_criteres, width, height, center_x, center_y, zoom) {
    // draw criteres :
    for (let j = 0; j < nb_criteres; j++) {
        let critere_vector = new Array(nb_criteres).fill(0);
        critere_vector[j] = 1;
        let coords = this.projectPoint(critere_vector);

        this.svgrenderer.line(center_x, center_y, center_x + coords.x * zoom, center_y - coords.y * zoom).stroke({ color: chartColor[3][5], width: 2 }).marker('end', 10, 10, function (add) {
            add.polygon('0,3 5,5 0,7').fill(chartColor[3][5]);
        });

        coords = [coords.x, coords.y]
        coords = Vector.setNorm(coords, Vector.getNorm(coords) * zoom + 10);
        this.svgrenderer.text(this.problem_descr.criteres[j].name).font({
            anchor: 'right',
            leading: '1em'
        }).center(
            center_x + coords[0],
            center_y - coords[1]
        );
    }
};
GAIAPlane.prototype.__drawBrain = function (nb_solutions, nb_criteres, width, height, center_x, center_y, zoom, projectionPA) {
    // draw Human Brain
    let HumanBrainPath = new Array(2 / .05);
    let projectionPA_coord = [projectionPA.x, projectionPA.y];

    for (let teta = 0, i = 0; teta < Math.PI; teta += .05 * Math.PI, i++) {
        let coord = [Math.cos(teta), Math.sin(teta)]
        let vector = Vector.calcALinear(coord[0], this.axe_x, coord[1], this.axe_y);
        let delta = this.projectDeltaWeightOn(vector) / 2;
        let a = Vector.calcALinear(delta, coord, 1, projectionPA_coord),
        b = Vector.calcALinear(-delta, coord, 1, projectionPA_coord);

        HumanBrainPath[i] = [center_x + a[0] * zoom, center_y - a[1] * zoom];
        HumanBrainPath[i + (1/.05)] = [center_x + b[0] * zoom, center_y - b[1] * zoom];
    }
    this.svgrenderer.polygon(HumanBrainPath).fill(chartColor[0][1]+'aa');
};
GAIAPlane.prototype.__drawPromethee_axis = function (nb_solutions, nb_criteres, width, height, center_x, center_y, zoom, projectionPA) {
    // draw promethee axis:
    this.svgrenderer.line(center_x, center_y, center_x + projectionPA.x * zoom, center_y - projectionPA.y * zoom).stroke({ color: chartColor[0][3], width: 2 })
        .marker('end', 10, 10, function (add) {
            add.polygon('0,3 5,5 0,7').fill(chartColor[0][3]);
        });
};

GAIAPlane.prototype.drawProfiles = function () {
    var nb_criteres = this.problem_descr.criteres.length,
        nb_solutions = this.problem_descr.solutions.length;
    var container = document.getElementById('solutions_profiles'),
        width = container.offsetWidth - 60;
    var rectWidth = (width - 10) / nb_criteres;
    var baseSVG = SVG().size(width, 150);
    var Phi_value = new Array(nb_criteres);

    // création de la base :
    baseSVG.line(5, 150, 5, 0).stroke({ color: chartColor[3][5], width: 2 }).marker('end', 10, 10, function (add) {
        add.polygon('0,3 5,5 0,7').fill(chartColor[3][5]);
    });

    for (let j = 0; j < nb_criteres; j++) {
        Phi_value[j] = baseSVG.rect(rectWidth - 10, 50).move(rectWidth * j + 10, 75).fill(chartColor[1][2]+'88').stroke({ color: chartColor[1][4], width: 1 }).radius(2);
        
        baseSVG.text(this.problem_descr.criteres[j].name).font({
            anchor: 'top',
            leading: '.5em'
        }).center(rectWidth * (j + .5), 130 + (j % 2 == 1) * 10);
    }

    baseSVG.line(0, 75, width, 75).stroke({ color: chartColor[3][5], width: 2 });

    // reset du conteneur
    container.innerHTML = '';
    // on créer les différents profiles
    for (let i = 0; i < nb_solutions; i++) {
        let profile_container = document.createElement('div');

        for (let j = 0; j < nb_criteres; j++)
            if (this.mps[i][j] <= 0) Phi_value[j].size(rectWidth - 10, - this.mps[i][j] * 50).move(rectWidth * j + 10, 75);
            else Phi_value[j].size(rectWidth - 10, this.mps[i][j] * 50).move(rectWidth * j + 10, 75 - this.mps[i][j] * 50);


        profile_container.innerHTML = '<div class="name">'+this.problem_descr.solutions[i].name+'</div><div>'+baseSVG.svg()+'</div>';
        container.appendChild(profile_container);
    }
};