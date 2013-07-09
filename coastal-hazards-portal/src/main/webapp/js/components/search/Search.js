var CCH = CCH || {};
CCH.Objects.Search = function(args) {
	var me = (this === window) ? {} : this;
	me.searchbar = args.searchbar;
	me.geocodeEndoint = args.geocodeEndoint;
	me.modalContainer = args.modalContainer;
	me.north = args.north;
	me.south = args.south;
	me.east = args.east;
	me.west = args.west;
	me.popularityInput = args.popularityInput;
	me.popularityRange = args.popularityRange;
	me.searchContainer = args.searchContainer;
	me.submitButton = args.submitButton;
	me.keywordInput = args.keywordInput;
	me.themeInput = args.themeInput;
	me.itemSearchModalWindow = args.itemSearchModalWindow;
	me.popularityCb = args.popularityCb;
	me.searchQuery = args.searchQuery;
	return $.extend(me, {
		init: function() {
			$(window).resize(function(evt) {
				if (window.innerWidth > 320 && !document.getElementById('item-search-map').childNodes.length) {
					me.buildMap();
				}
			});
			me.bindGeolocationInput();
			me.bindSearchModalButton();
			me.itemSearchModalWindow.css('display', 'none');
			return me;
		},
		bindGeolocationInput: function() {
			me.searchbar.submit(function(evt) {
				var query = me.searchQuery.val();
				if (query) {
					$.ajax({
						type: 'GET',
						url: me.geocodeEndoint,
						data: {
							text: query,
							maxLocations: '20',
							outFields: '*',
							f: 'pjson',
							outSR: '3785'
						},
						async: false,
						contentType: 'application/json',
						dataType: 'jsonp',
						success: function(json) {
							if (json.locations[0]) {
								CCH.map.buildGeocodingPopup({
									locations: json.locations
								});

							}

							$(window).trigger('cch.searchbar.submit.success', {
								query: query,
								response: json
							});
						}
					});
				}

				$(window).trigger('cch.search.geocode.submit', {
					query: query
				});
			});
		},
		transformBBOX3857to4326: function(extent) {
			return extent.transform(new OpenLayers.Projection('EPSG:3857'), new OpenLayers.Projection('EPSG:4326'));
		},
		updateSearchBBOX: function(extent) {
			me.north.html(extent.top.toFixed(4));
			me.south.html(extent.bottom.toFixed(4));
			me.west.html(extent.left.toFixed(4));
			me.east.html(extent.right.toFixed(4));
		},
		buildMap: function() {
			var miniMap = new OpenLayers.Map('item-search-map', {
				projection: "EPSG:900913",
				displayProjection: new OpenLayers.Projection("EPSG:900913")
			});

			miniMap.addLayer(new OpenLayers.Layer.XYZ("Shaded Relief",
					"http://services.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/${z}/${y}/${x}",
					{
						sphericalMercator: true,
						isBaseLayer: true,
						numZoomLevels: 14,
						wrapDateLine: true
					}
			));

			miniMap.zoomToMaxExtent();
			var extent = me.transformBBOX3857to4326(miniMap.getExtent());
			me.updateSearchBBOX(extent);


			miniMap.events.on({
				'moveend': function(evt) {
					var map = evt.object;
					var extent = me.transformBBOX3857to4326(map.getExtent());
					me.updateSearchBBOX(extent);
				}
			});
		},
		isMapVisible: function() {
			return $('#item-search-row-map').css('display') !== 'none';
		},
		bindSearchModalButton: function() {
			if (me.isMapVisible()) {
				me.buildMap();
			}

			me.searchContainer.on({
				'click': function() {
					me.modalContainer.modal('show');
				}
			});

			me.submitButton.on({
				'click': function() {
					me.modalContainer.modal('hide');

					var bboxSearch = {};
					if (me.isMapVisible()) {
						bboxSearch = {
							'top': me.north.html(),
							'bottom': me.south.html(),
							'left': me.west.html(),
							'right': me.east.html()
						};
					}

					$(window).trigger('cch.search.item.submit', 
					$.extend({
						'popularity': me.popularityCb.is(':checked'),
						'keywords': me.keywordInput.val(),
						'themes': me.themeInput.find('option:selected').toArray().map(function(option) {
							return option.value;
						})
					}, bboxSearch));

					CCH.slideshow.stop();
				}
			});
		}
	});
};