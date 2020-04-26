var Vector = {
    /**
     * Realise le produit scalaire du vecteur a par le vecteur b
     * @param {Array} a : vecteur
     * @param {Array} b : vecteur
     */
    scalarProduct: function (a, b) {
        var nb_dimension = a.length,
            result = 0;

        for (let i = 0; i < nb_dimension; i++)
            result += a[i] * b[i];
        
        return result;
    },

    /**
     * Retourne la norme d'un vecteur
     * @param {Array} a : vecteur
     */
    getNorm: function (a) {
        return Math.sqrt(Vector.scalarProduct(a, a));
    },

    setNorm: function(a, norm) {
        var actualNorm = Vector.getNorm(a),
            nb_dimension = a.length;
        var newVector = new Array(nb_dimension);

        for (let i = 0; i < nb_dimension; i++)
            newVector[i] = a[i] * norm / actualNorm;
        
        return newVector;
    },

    calcALinear: function (coef1, vector1, coef2, vector2) {
        var nb_dimension = vector1.length;
        var newVector = new Array(nb_dimension);

        for (let i = 0; i < nb_dimension; i++)
            newVector[i] = coef1 * vector1[i] + coef2 * vector2[i];
        
        return newVector;
    },

    getManhattanNorm: function (a) {
        var nb_dimension = a.length;
        var norm = 0;
        for (let i = 0; i < nb_dimension; i++)
            norm += Math.abs(a[i]);
        return norm;
    },
    
    setManhattanNorm: function(a, norm) {
        var actualNorm = Vector.getManhattanNorm(a),
            nb_dimension = a.length;
        if (actualNorm == 0) return a;
        var newVector = new Array(nb_dimension);

        for (let i = 0; i < nb_dimension; i++)
            newVector[i] = a[i] * norm / actualNorm;
        
        return newVector;
    }
};