(function() {
	 pandemix.map.regionOutlineLayer = L.Class.extend({
            svg: undefined,

            g: undefined,

            bounds: undefined,

            path: undefined,

            feature: undefined,

            project: undefined,

            initialize: function(args) {
                var that = this;
                that.map = args.map;
                that.project = args.project;
                that.bounds = args.bounds;

                that.anchor = that.map.getPanes().overlayPane.appendChild(L.DomUtil.create("div", "layerAnchor"));

                that.el = L.DomUtil.create('div', 'provinceLayer leaflet-zoom-hide');
                that.svg = d3.select(that.el).append("svg");

                that.svg.on("mousedown", function() {event.preventDefault(); });
                that.g = that.svg.append("g");

                processData(args.mapData);

                function processData(dat) {
                    
                    that.path = d3.geo.path().projection(that.project);

                    that.feature = that.g.selectAll(".mapPath")
                                    .data(dat.features)
                                    .enter().append("path")
                                    .attr("class", "mapPath")
                                    .on("click", function(d) {
                                        //find names via crossfilter
                                        pandemix.dateDim.filter(null);
                                        pandemix.selectedLeaves = pandemix.locDim.filter(d.properties.name).top(Infinity);
                                        pandemix.callUpdate("leafSelectionUpdate");
                                        //if no taxa are in that location, the clicked province won't highlight 
                                        //from the selection update so highlight manually
                                        d3.select(this).classed("mapHighlighted", true);
                                    });                    
                }
				
				/*var st = [-130, 36];//args.centroids["Russia"];
				var nd = args.centroids["Russia"];
				
				var steps = 100;
				
				var incrX = (nd[0] - st[0]) / steps;
				var incrY = (nd[1] - st[1]) / steps;
				
				var chord = [];
				
				for (var ii = 0; ii <= steps; ii += 1) {
					chord.push([st[0] + ii * incrX, st[1] + ii * incrY]);
				}
				
				var geoJSONChord = {coordinates: chord, type: "LineString"};
				console.log(geoJSONChord);
				
				var tst = that.g.append("path").datum(geoJSONChord).attr("d", that.path).attr("class", "chord");
				console.log(tst);
				
                that.reset();*/


            },

            onAdd: function() {
                var that = this;
                that.anchor.appendChild(that.el);
                that.map.on('viewreset', that.reset, that);
                that.reset();
            },

            onRemove: function() {
                // remove layer's DOM elements and listeners
                var that = this;
                that.anchor.removeChild(that.el);
                that.map.off('viewreset', that.reset, that);
            },

            reset: function() {
            	var that = this;
                var bottomLeft = that.project(that.bounds[0]),
                topRight = that.project(that.bounds[1]);


                that.svg .attr("width", Math.abs(topRight[0] - bottomLeft[0]))
                    .attr("height", Math.abs(bottomLeft[1] - topRight[1]))
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                that.feature.attr("d", that.path);
            },

            leafSelectionUpdate: function(selectedRegions) {
            	this.feature.classed("mapHighlighted", function(d) {
                    return pandemix.contains(selectedRegions, d.properties.name);
                });
            }

        });

})();








