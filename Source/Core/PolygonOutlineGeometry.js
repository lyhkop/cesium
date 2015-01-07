/*global define*/
define([
        './BoundingSphere',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './PolygonGeometryLibrary',
        './PolygonPipeline',
        './PrimitiveType',
        './Queue',
        './WindingOrder'
    ], function(
        BoundingSphere,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        PolygonGeometryLibrary,
        PolygonPipeline,
        PrimitiveType,
        Queue,
        WindingOrder) {
    "use strict";
    var createGeometryFromPositionsPositions = [];
    var createGeometryFromPositionsSubdivided = [];

    function createGeometryFromPositions(ellipsoid, positions, minDistance, perPositionHeight) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);

        //>>includeStart('debug', pragmas.debug);
        if (cleanedPositions.length < 3) {
            throw new DeveloperError('Duplicate positions result in not enough positions to form a polygon.');
        }
        //>>includeEnd('debug');

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }

        var subdividedPositions;
        var i;

        var length = cleanedPositions.length;
        var index = 0;

        if (!perPositionHeight) {
            var numVertices = 0;
            for (i = 0; i < length; i++) {
                numVertices += PolygonGeometryLibrary.subdivideLineCount(cleanedPositions[i], cleanedPositions[(i + 1) % length], minDistance);
            }
            subdividedPositions = new Float64Array(numVertices * 3);
            for (i = 0; i < length; i++) {
                var tempPositions = PolygonGeometryLibrary.subdivideLine(cleanedPositions[i], cleanedPositions[(i + 1) % length], minDistance, createGeometryFromPositionsSubdivided);
                var tempPositionsLength = tempPositions.length;
                for (var j = 0; j < tempPositionsLength; ++j) {
                    subdividedPositions[index++] = tempPositions[j];
                }
            }
        } else {
            subdividedPositions = new Float64Array(length * 2 * 3);
            for (i = 0; i < length; i++) {
                var p0 = cleanedPositions[i];
                var p1 = cleanedPositions[(i + 1) % length];
                subdividedPositions[index++] = p0.x;
                subdividedPositions[index++] = p0.y;
                subdividedPositions[index++] = p0.z;
                subdividedPositions[index++] = p1.x;
                subdividedPositions[index++] = p1.y;
                subdividedPositions[index++] = p1.z;
            }
        }

        length = subdividedPositions.length / 3;
        var indicesSize = length * 2;
        var indices = IndexDatatype.createTypedArray(length, indicesSize);
        index = 0;
        for (i = 0; i < length - 1; i++) {
            indices[index++] = i;
            indices[index++] = i + 1;
        }
        indices[index++] = length - 1;
        indices[index++] = 0;

        return new GeometryInstance({
            geometry : new Geometry({
                attributes : new GeometryAttributes({
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : subdividedPositions
                    })
                }),
                indices : indices,
                primitiveType : PrimitiveType.LINES
            })
        });
    }

    function createGeometryFromPositionsExtruded(ellipsoid, positions, minDistance, perPositionHeight) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);

        //>>includeStart('debug', pragmas.debug);
        if (cleanedPositions.length < 3) {
            throw new DeveloperError('Duplicate positions result in not enough positions to form a polygon.');
        }
        //>>includeEnd('debug');

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }

        var subdividedPositions;
        var i;

        var length = cleanedPositions.length;
        var corners = new Array(length);
        var index = 0;

        if (!perPositionHeight) {
            var numVertices = 0;
            for (i = 0; i < length; i++) {
                numVertices += PolygonGeometryLibrary.subdivideLineCount(cleanedPositions[i], cleanedPositions[(i + 1) % length], minDistance);
            }

            subdividedPositions = new Float64Array(numVertices * 3 * 2);
            for (i = 0; i < length; ++i) {
                corners[i] = index / 3;
                var tempPositions = PolygonGeometryLibrary.subdivideLine(cleanedPositions[i], cleanedPositions[(i + 1) % length], minDistance, createGeometryFromPositionsSubdivided);
                var tempPositionsLength = tempPositions.length;
                for (var j = 0; j < tempPositionsLength; ++j) {
                    subdividedPositions[index++] = tempPositions[j];
                }
            }
        } else {
            subdividedPositions = new Float64Array(length * 2 * 3 * 2);
            for (i = 0; i < length; ++i) {
                corners[i] = index / 3;
                var p0 = cleanedPositions[i];
                var p1 = cleanedPositions[(i + 1) % length];

                subdividedPositions[index++] = p0.x;
                subdividedPositions[index++] = p0.y;
                subdividedPositions[index++] = p0.z;
                subdividedPositions[index++] = p1.x;
                subdividedPositions[index++] = p1.y;
                subdividedPositions[index++] = p1.z;
            }
        }

        length = subdividedPositions.length / (3 * 2);
        var cornersLength = corners.length;

        var indicesSize = ((length * 2) + cornersLength) * 2;
        var indices = IndexDatatype.createTypedArray(length, indicesSize);

        index = 0;
        for (i = 0; i < length; ++i) {
            indices[index++] = i;
            indices[index++] = (i + 1) % length;
            indices[index++] = i + length;
            indices[index++] = ((i + 1) % length) + length;
        }

        for (i = 0; i < cornersLength; i++) {
            var corner = corners[i];
            indices[index++] = corner;
            indices[index++] = corner + length;
        }

        return new GeometryInstance({
            geometry : new Geometry({
                attributes : new GeometryAttributes({
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : subdividedPositions
                    })
                }),
                indices : indices,
                primitiveType : PrimitiveType.LINES
            })
        });
    }

    /**
     * A description of the outline of a polygon on the ellipsoid. The polygon is defined by a polygon hierarchy.
     *
     * @alias PolygonOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Object} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     *
     * @see PolygonOutlineGeometry#createGeometry
     * @see PolygonOutlineGeometry#fromPositions
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polygon%20Outline.html|Cesium Sandcastle Polygon Outline Demo}
     *
     * @example
     * // 1. create a polygon outline from points
     * var polygon = new Cesium.PolygonOutlineGeometry({
     *   polygonHierarchy : {
     *     positions : Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   }
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygon);
     *
     * // 2. create a nested polygon with holes outline
     * var polygonWithHole = new Cesium.PolygonOutlineGeometry({
     *   polygonHierarchy : {
     *     positions : Cesium.Cartesian3.fromDegreesArray([
     *       -109.0, 30.0,
     *       -95.0, 30.0,
     *       -95.0, 40.0,
     *       -109.0, 40.0
     *     ]),
     *     holes : [{
     *       positions : Cesium.Cartesian3.fromDegreesArray([
     *         -107.0, 31.0,
     *         -107.0, 39.0,
     *         -97.0, 39.0,
     *         -97.0, 31.0
     *       ]),
     *       holes : [{
     *         positions : Cesium.Cartesian3.fromDegreesArray([
     *           -105.0, 33.0,
     *           -99.0, 33.0,
     *           -99.0, 37.0,
     *           -105.0, 37.0
     *         ]),
     *         holes : [{
     *           positions : Cesium.Cartesian3.fromDegreesArray([
     *             -103.0, 34.0,
     *             -101.0, 34.0,
     *             -101.0, 36.0,
     *             -103.0, 36.0
     *           ])
     *         }]
     *       }]
     *     }]
     *   }
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygonWithHole);
     *
     * // 3. create extruded polygon outline
     * var extrudedPolygon = new Cesium.PolygonOutlineGeometry({
     *   polygonHierarchy : {
     *     positions : Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ]),
     *     extrudedHeight: 300000
     *   }
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(extrudedPolygon);
     */
    var PolygonOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var height = defaultValue(options.height, 0.0);
        var perPositionHeight = defaultValue(options.perPositionHeight, false);

        var extrudedHeight = options.extrudedHeight;
        var extrude = (defined(extrudedHeight) && (!CesiumMath.equalsEpsilon(height, extrudedHeight, CesiumMath.EPSILON6) || perPositionHeight));
        if (extrude) {
            var h = extrudedHeight;
            extrudedHeight = Math.min(h, height);
            height = Math.max(h, height);
        }
        var polygonHierarchy = options.polygonHierarchy;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(polygonHierarchy)) {
            throw new DeveloperError('options.polygonHierarchy is required.');
        }
        //>>includeEnd('debug');

        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._granularity = granularity;
        this._height = height;
        this._extrudedHeight = defaultValue(extrudedHeight, 0.0);
        this._extrude = extrude;
        this._polygonHierarchy = polygonHierarchy;
        this._perPositionHeight = perPositionHeight;
        this._workerName = 'createPolygonOutlineGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + Ellipsoid.packedLength + 5;
    };

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    PolygonOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(value._polygonHierarchy, array, startingIndex);

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._height;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._extrude ? 1.0 : 0.0;
        array[startingIndex] = value._perPositionHeight ? 1.0 : 0.0;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchOptions = {
        polygonHierarchy : undefined,
        ellipsoid : scratchEllipsoid,
        height : undefined,
        extrudedHeight : undefined,
        granularity : undefined,
        perPositionHeight : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PolygonOutlineGeometry} [result] The object into which to store the result.
     */
    PolygonOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var polygonHierarchy = PolygonGeometryLibrary.unpackPolygonHierarchy(array, startingIndex);
        startingIndex = polygonHierarchy.startingIndex;
        delete polygonHierarchy.startingIndex;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var height = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var granularity = array[startingIndex++];
        var extrude = array[startingIndex++] === 1.0;
        var perPositionHeight = array[startingIndex] === 1.0;

        if (!defined(result)) {
            scratchOptions.polygonHierarchy = polygonHierarchy;
            scratchOptions.height = height;
            scratchOptions.extrudedHeight = extrudedHeight;
            scratchOptions.granularity = granularity;
            scratchOptions.perPositionHeight = perPositionHeight;
            return new PolygonOutlineGeometry(scratchOptions);
        }

        result._polygonHierarchy = polygonHierarchy;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._height = height;
        result._extrudedHeight = extrudedHeight;
        result._granularity = granularity;
        result._extrude = extrude;
        result._perPositionHeight = perPositionHeight;

        return result;
    };

    /**
     * A description of a polygon outline from an array of positions.
     *
     * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     *
     * @see PolygonGeometry#createGeometry
     *
     * @example
     * // create a polygon from points
     * var polygon = Cesium.PolygonOutlineGeometry.fromPositions({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     -72.0, 40.0,
     *     -70.0, 35.0,
     *     -75.0, 30.0,
     *     -70.0, 30.0,
     *     -68.0, 40.0
     *   ])
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygon);
     */
    PolygonOutlineGeometry.fromPositions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.positions)) {
            throw new DeveloperError('options.positions is required.');
        }
        //>>includeEnd('debug');

        var newOptions = {
            polygonHierarchy : {
                positions : options.positions
            },
            height : options.height,
            extrudedHeight : options.extrudedHeight,
            ellipsoid : options.ellipsoid,
            granularity : options.granularity,
            perPositionHeight : options.perPositionHeight
        };
        return new PolygonOutlineGeometry(newOptions);
    };

    /**
     * Computes the geometric representation of a polygon outline, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolygonOutlineGeometry} polygonGeometry A description of the polygon outline.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} Duplicate positions result in not enough positions to form a polygon.
     */
    PolygonOutlineGeometry.createGeometry = function(polygonGeometry) {
        var ellipsoid = polygonGeometry._ellipsoid;
        var granularity = polygonGeometry._granularity;
        var height = polygonGeometry._height;
        var extrudedHeight = polygonGeometry._extrudedHeight;
        var extrude = polygonGeometry._extrude;
        var polygonHierarchy = polygonGeometry._polygonHierarchy;
        var perPositionHeight = polygonGeometry._perPositionHeight;

        // create from a polygon hierarchy
        // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
        var polygons = [];
        var queue = new Queue();
        queue.enqueue(polygonHierarchy);
        var i;
        while (queue.length !== 0) {
            var outerNode = queue.dequeue();
            var outerRing = outerNode.positions;

            if (outerRing.length < 3) {
                throw new DeveloperError('At least three positions are required.');
            }

            var numChildren = outerNode.holes ? outerNode.holes.length : 0;
            // The outer polygon contains inner polygons
            for (i = 0; i < numChildren; i++) {
                var hole = outerNode.holes[i];
                polygons.push(hole.positions);

                var numGrandchildren = 0;
                if (defined(hole.holes)) {
                    numGrandchildren = hole.holes.length;
                }

                for ( var j = 0; j < numGrandchildren; j++) {
                    queue.enqueue(hole.holes[j]);
                }
            }

            polygons.push(outerRing);
        }

        var geometry;
        var geometries = [];
        var minDistance = CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);

        if (extrude) {
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositionsExtruded(ellipsoid, polygons[i], minDistance, perPositionHeight);
                geometry.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(geometry.geometry, height, extrudedHeight, ellipsoid, perPositionHeight);
                geometries.push(geometry);
            }
        } else {
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositions(ellipsoid, polygons[i], minDistance, perPositionHeight);
                geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, height, ellipsoid, !perPositionHeight);
                geometries.push(geometry);
            }
        }

        geometry = GeometryPipeline.combineInstances(geometries)[0];
        var boundingSphere = BoundingSphere.fromVertices(geometry.attributes.position.values);

        return new Geometry({
            attributes : geometry.attributes,
            indices : geometry.indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : boundingSphere
        });
    };

    return PolygonOutlineGeometry;
});
