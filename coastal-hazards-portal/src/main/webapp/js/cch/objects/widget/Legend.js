/*jslint browser: true*/
/*jslint plusplus: true */
/*global $*/
/*global LOG*/
/*global CCH*/
/*global Handlebars*/

window.CCH = CCH || {};
CCH.Objects = CCH.Objects || {};
CCH.Objects.Widget = CCH.Objects.Widget || {};

CCH.Objects.Widget.LegendTypes = {
	//clientId : serverId
	CONTINUOUS: 'CONTINUOUS',
	DISCRETE: 'DISCRETE'
};

CCH.Objects.Widget.Legend = function (args) {
	"use strict";
	var me = (this === window) ? {} : this;
	
	$.extend(true, me, args);
	
	me.errorMessage = 'Legend.js:: %s Legend could not be created.';
	me.$container = null;
	me.$legendDiv = $('<div />').html('Loading...');
	me.items = [];
	me.itemTypes = new CCH.Objects.Items().Types;
	me.owsUtils = new CCH.Util.OWS();
	// If available, this class is added to $legendDiv
	me.legendClass = args.legendClass;
	// I keep track of ongoing ajax requests. When I destroy this object
	me.ajaxRequests = [];
	// A flag that informs any ongoing processes in this object whether or not the object has already been destroyed.
	// There are edge cases where the application may not want the ajax calls from this object to complete and if
	// this gets flipped to true, I want to stop all processes as soon as possible
	me.destroyed = false;
	me.init = function () {
		CCH.LOG.trace('Legend.js::constructor:Legend class is initializing.');
		me.$container = $('#' + me.containerId);
		me.$container.append(me.$legendDiv);
		if (me.$container.length === 0) {
			throw me.errorMessage.replace('%s', 'containerId  "' + me.containerId + '" not found in document.');
		}

		if (me.legendClass) {
			me.$legendDiv.addClass(me.legendClass);
		}

		me.generateLegend({
			item: me.item
		});

		return me;
	};

	me.generateLegend = function (args) {
		args = args || {};
		var item = args.item,
				itemType = item.type;

		if (itemType === me.itemTypes.HISTORICAL) {
			me.generateHistoricalLegendTables({
				item: item
			});
		} else if (itemType === me.itemTypes.STORMS) {
			me.generateStormLegendTables({
				item: item
			});
		} else if (itemType === me.itemTypes.VULNERABILITY) {
			me.generateVulnerabilityLegendTables({
				item: item
			});
		} else if (itemType === me.itemTypes.MIXED) {
			me.generateMixedLegendTables({
				item: item
			});
		} else if (itemType === me.itemTypes.TRACK) {
			me.generateRealTimeStormLegendTable({
				item: item
			});
		} else {
			me.hide();
		}

		return me;
	};
	/**
	 * 
	 * @param {Object} args an object that contains the following (
	 *	@param {Object} sld
	 *	@param {Function} binLabeler a function for labeling each bin.
	 *		This function can accept the following params:
	 *		@param {Object} bin
	 *		@param {Number} index - the index of iteration
	 *		@param {Array<Object>} bins - an array of bins sorted in ascending order according to each bin's 'lowerBound' property.
	 * )
	 * @returns {jQuery} a legend table element
	 */
	me.generateGenericContinuousLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			binLabeler = args.binLabeler,
			$table = $('<table />'),
			$thead = $('<thead />'),
			$caption = $('<caption />'),
			$tbody = $('<tbody/>'),
			$innerTr = $('<tr/>'),
			$innerTd = $('<td colspan="2"/>'),
			$theadTr = $('<tr />'),
			$theadUOM = $('<td />'),
			bins = sld.bins,
			uom = sld.units || '',
			title = (args.item && args.item.summary && args.item.summary && args.item.summary.legend) ? args.item.summary.legend.title : sld.title || ''
			;
		//assume that the gradient is evenly-spaced
		var numberOfNonTerminalBins = bins.length - 2;
		var gradientIncrement = 100 / (1 + numberOfNonTerminalBins);
		var binsForTemplate = bins.sort(args.sorter).map(function(bin, index, bins){
			var percent = index * gradientIncrement;
			return {
				'color': bin.color,
				'percent': percent,
				'binLabel': binLabeler(bin, index, bins)
			};
		});
		var $legendElt = $(CCH.Objects.Widget.Legend.prototype.templates.continuous({
			browserSpecificGradients : [
				//order matters
				'-webkit-linear-gradient',/* For Safari 5.1 to 6.0 */
				'-o-linear-gradient',/*For Opera 11.1 to 12.0 */
				'-moz-linear-gradient',/*For Firefox 3.6 to 15 */
				'linear-gradient'/*Standard syntax */
			],
			bins: binsForTemplate
		}));
		// Create the table head which displays the unit of measurements
		$caption.html(title);
		$theadUOM.html(uom);
		$theadTr.append($('<td />'), $theadUOM);
		$thead.append($theadTr);
		$table.append($caption, $thead);
		$table.append($tbody);
		$tbody.append($innerTr);
		$innerTr.append($innerTd);
		$innerTd.append($legendElt);
		return $table;
        };
	me.generateGenericDiscreteLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			$table = $('<table />'),
			$thead = $('<thead />'),
			$caption = $('<caption />'),
			$theadTr = $('<tr />'),
			$theadUOM = $('<td />'),
			$colorContainer,
			$tr,
			$colorTd,
			$rangeTd,
			bins = sld.bins,
			uom = sld.units || '',
			title = (args.item && args.item.summary && args.item.summary && args.item.summary.legend) ? args.item.summary.legend.title : sld.title || '',
			upperBound,
			lowerBound,
			category,
			years,
			color,
			range;
	
		// Create the table head which displays the unit of measurements
		$caption.html(title);
		$theadUOM.html(uom);
		$theadTr.append($('<td />'), $theadUOM);
		$thead.append($theadTr);
		$table.append($caption, $thead);
		bins.forEach(function (bin) {
			$tr = $('<tr />');
			$colorTd = $('<td />');
			$colorTd.addClass('discrete_legend_color_entry');
			$rangeTd = $('<td />');
			$rangeTd.addClass('discrete_legend_text_cell');
			$colorContainer = $('<span />');
			upperBound = bin.upperBound;
			lowerBound = bin.lowerBound;
			years = bin.years;
			category = bin.category;
			color = bin.color;
			range = null;

			if (bin.category) {
				range = category;
			} else if (bin.years) {
				range = years;
			} else {
				range = me.generateRangeString(upperBound, lowerBound);
			}

			$colorContainer.attr('style', 'background-color:' + color + ' !important');
			$colorTd.append($colorContainer);
			$rangeTd.html(range);
			$tr.append($colorTd, $rangeTd);
			$table.append($tr);
		});
		return $table;
	};

	me.generateMixedLegendTables = function (args) {
		args = args || {};
		var item = args.item,
				childItems;
		if ('aggregation' === item.itemType.toLowerCase() ||
			'template' === item.itemType.toLowerCase()) {
			childItems = me.getAggregationChildrenIds(item.id);
		} else {
			childItems = [item.id];
		}

		me.createLegendsFromItems({
			items: childItems,
			generateLegendTable: me.generateMixedLegendTable
		});
	};

	me.generateMixedLegendTable = function (args) {
		args = args || {};
		var item = args.item,
				$legendTable,
				attr = item.attr,
				index = args.index || null,
				sld = args.sld;

		$legendTable = me.generateGenericDiscreteLegendTable({
			sld: sld,
			item : item
		});

		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});

		return $legendTable;
	};

	me.generateRealTimeStormLegendTable = function (args) {
		var item = args.item;
		var table = CCH.Objects.Widget.Legend.prototype.templates.rts_legend({
			id: item.id,
			title: args.item.summary.legend.title,
			baseUrl: CCH.CONFIG.contextPath
		});

		me.tableAdded({
			total : 1,
			legendTables : [$(table)],
			item : args.item
		});
	};

	me.generateHistoricalLegendTables = function (args) {
		args = args || {};
		var item = args.item,
				childItemIdArray,
				dataItem,
				isYearAggregation;

		if ('aggregation' === item.itemType.toLowerCase() ||
			'template' === item.itemType.toLowerCase()) {
			childItemIdArray = me.getAggregationChildrenIds(item.id);

			// Figure out if this is a date-type historical aggregation. If so, I'll have to stitch together the year 
			// array
			dataItem = function (items) {
				var dataItemId = items.find(function (id) {
					return CCH.items.getById({id: id}).itemType === 'data';
				});

				return CCH.items.getById({id: dataItemId});
			}(childItemIdArray);

			// Because this is an aggregation of dates, I want to only use the top level aggregation item 
			// because that SLD will hold all of the dates necessary. The back-end service inserts all of the dates
			// and color maps that the aggregation contains for its children
			isYearAggregation = dataItem.attr.toLowerCase().indexOf('date') !== -1;
			if (isYearAggregation) {
				childItemIdArray = [item.id];
			}
		} else {
			childItemIdArray = [item.id];
		}

		me.createContinuousLegendFromItems({
			items: childItemIdArray,
			tableAddedCallback: null,
			generateLegendTable: me.generateHistoricalLegendTable
		});
	};

	me.generateStormLegendTables = function (args) {
		args = args || {};
		var item = args.item,
				childItems,
				// A storm item may have children that are active storms.
				// If so, I want to display the active storm legend if it 
				// does not yet exist
				containsTrackItems = item.getChildren().some(function (c) {
					return c.type === me.itemTypes.TRACK;
				});

		if ('aggregation' === item.itemType.toLowerCase() ||
			'template' === item.itemType.toLowerCase()) {
			childItems = me.getAggregationChildrenIds(item.id);
		} else {
			childItems = [item.id];
		}

		me.createLegendsFromItems({
			items: childItems,
			generateLegendTable: me.generateStormLegendTable
		});
		
		if (containsTrackItems) {
			$(window).on('legend-tables-added', function (legend) {
				// The legend is now built so I just want to tack on this storm
				// track legend to the bottom of it
				var stormTrackTable = CCH.Objects.Widget.Legend.prototype.templates.rts_legend({
					id: "storm_track",
					title: "Storm Track",
					baseUrl: CCH.CONFIG.contextPath
				});
				me.$legendDiv.append(stormTrackTable);
			});
		}
	};

	me.generateStormLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			item = args.item,
			index = args.index,
			attr = item.attr,
			$legendTable = me.generateGenericDiscreteLegendTable({
				sld: sld,
				item : item
			});

		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});

		return $legendTable;
	};

	me.generateVulnerabilityLegendTables = function (args) {
		args = args || {};
		var item = args.item,
				childItems;
		if ('aggregation' === item.itemType.toLowerCase() ||
			'template' === item.itemType.toLowerCase()) {
			childItems = me.getAggregationChildrenIds(item.id);
		} else {
			childItems = [item.id];
		}

		me.createLegendsFromItems({
			items: childItems,
			generateLegendTable: me.generateVulnerabilityLegendTable
		});
	};
	/**
	 * Inspect the sld and/or item. If the legend rendering needs to be
	 * customized, change what would be returned. By default return:
	 * {
	 *	sld: sld,
	 *	item : item
	 * }
	 * 
	 * @param {Object} sld
	 * @param {Object} item
	 * @returns {Object} an object to pass to a legend renderer function
	 */
	me.customizeLegendRendererArguments = function(sld, item) {
		var legendRendererArguments = {
			sld: sld,
			item: item
		};
		if(CCH.Objects.Widget.LegendTypes.CONTINUOUS === sld.legendType){
			//if it is continuous then you need a bin labeler
			var binLabeler = null;
			var sorter = null;
			if("CR" === item.attr){
				//customize the bin label
				var indexToText = {
					0 : '100% Dynamic',
					1 : '&nbsp;',
					2 : '0% Dynamic'
				};
				binLabeler = function(bin, index, bins){
					return indexToText[index];
				};
				sorter =  function(a,b){return b.lowerBound - a.lowerBound;};
			} else if("historical".localeCompare(item.type) === 0){
				binLabeler = function(bin, index, bins){
					if(index === 0){
						return bin.years;
					} else if(index === bins.length - 1){
						return bin.years;
					} else if((index - 1) < Math.floor(bins.length/2) && (index + 1) > Math.floor(bins.length/2)) {
						return bin.years;
					} else if((index - 1) < Math.floor(bins.length/4) && (index + 1) > Math.floor(bins.length/4)) {
						return "&nbsp;";
					} else if((index - 1) < Math.floor(3*bins.length/4) && (index + 1) > Math.floor(3*bins.length/4)) {
						return "&nbsp;";
					} else {
						return "";
					}
				};
				sorter = function(a,b){return b.years - a.years;};
			} else if ("UVVR_RASTER" === item.attr || "UVVR" === item.attr) {
				//customize the bin label and sorter function
				binLabeler = function (bin, index, bins) {
					if (index === 0) {
						return "Higher<br><br><br>";
					} else if (index === bins.length - 1) {
						return "Lower";
					} else {
						return "";
					}
				};
				sorter =  function(a,b){return b.lowerBound-a.lowerBound;};
			}
                        
			if(null === binLabeler){
				throw 'Could not find a bin labeler and sorter for the item "' + me.getItemTinyText(item) + '", and the following continuous legend sld:\n\n' + JSON.stringify(sld);
			} else {
				legendRendererArguments.binLabeler = binLabeler;
				legendRendererArguments.sorter = sorter;
			}
		}
		return legendRendererArguments;
	};
	
	/**
	 * @param {Object} item 
	 * @returns {String} legend title for the specified item, or '' if 
	 * the item is improperly structured. Mostly for error-reporting.
	 */
	me.getLegendTitle = function(item){
		var name = '';
		try{
			name = item.summary.legend.title;
		} catch(e){}//intentionally do nothing
		return name;
	};
	
	/**
	 * Creates a user-facing error message.
	 * It wraps the user-facing error message in a tbody. Other code breaks
	 * if there is no tbody present after this function runs.
	 * @param {String} msg the message to display to the user
	 * @returns {jQuery}
	 */
	me.createErrorLegendEntry = function(msg){
		var $legendTable = $('<table><tbody><tr><td><div style="color:red;">' + msg + '</td/></tr></tbody></table></div>');
		return $legendTable;
	};
	
	var legendTypeToRenderer = {};
	legendTypeToRenderer[CCH.Objects.Widget.LegendTypes.CONTINUOUS] = me.generateGenericContinuousLegendTable;
	legendTypeToRenderer[CCH.Objects.Widget.LegendTypes.DISCRETE] = me.generateGenericDiscreteLegendTable;
	
	/**
	 * 
	 * @param {String} legendType
	 * @returns {Function} a legend renderer
	 * @throws {Exception} if a legend renderer cannot be found for the specified type
	 */
	me.getLegendRenderer = function(legendType){
		var legendRenderer = legendTypeToRenderer[legendType];
		
		//intentional type-coercion
		if(undefined == legendRenderer){
			throw 'legend type "' + legendType + '" not found.';
		}
		return legendRenderer;
	};
	
	me.generateHistoricalLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
				item = args.item,
				attr = item.attr,
				index = args.index || null,
				$legendTable;
		
		var legendRenderer = null;

		try {
			legendRenderer = me.getLegendRenderer(sld.legendType);
		} catch(e){
			var name = me.getItemLegendTitle(item);

			var msg = "Could not determine legend renderer"; 
			if(name){
				msg+= " for item '" + name + "'.";
			}
			$legendTable = me.createErrorLegendEntry(msg);
			LOG.warn(msg + "\ngot legend type '" + sld.legendType + "'.");
			if (me.onError) {
				me.onError.call(me, arguments);
			}
		}

		if(legendRenderer){
			try {
				var rendererArguments = me.customizeLegendRendererArguments(sld, item);
				$legendTable = legendRenderer(rendererArguments);
			} catch (e){
				LOG.warn(e);
				$legendTable = me.createErrorLegendEntry('Could not customize rendering the legend of item "' + me.getItemLegendTitle() + '".');
				if (me.onError) {
					me.onError.call(me, arguments);
				}
				//do not re-throw. We want other potentially successful legend rendering to get a chance
			}
		}
		
		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});
		return $legendTable;
	};
	
	me.generateVulnerabilityLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			item = args.item,
			index = args.index,
			attr = item.attr,
			$legendTable;

		var legendRenderer = null;
		try {
			legendRenderer = me.getLegendRenderer(sld.legendType);
		} catch(e){
			var name = me.getItemLegendTitle(item);

			var msg = "Could not determine legend renderer"; 
			if(name){
				msg+= " for item '" + name + "'.";
			}
			$legendTable = me.createErrorLegendEntry(msg);
			LOG.warn(msg + "\ngot legend type '" + sld.legendType + "'.");
			if (me.onError) {
				me.onError.call(me, arguments);
			}
		}

		if(legendRenderer){
			try {
				var rendererArguments = me.customizeLegendRendererArguments(sld, item);
				$legendTable = legendRenderer(rendererArguments);
			} catch (e){
				LOG.warn(e);
				$legendTable = me.createErrorLegendEntry('Could not customize rendering the legend of item "' + me.getItemLegendTitle() + '".');
				if (me.onError) {
					me.onError.call(me, arguments);
				}
				//do not re-throw. We want other potentially successful legend rendering to get a chance
			}
		}
		
		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});
		return $legendTable;
	};
	
	me.createContinuousLegendFromItems = function(args) {
		args = args || {};
		var items = args.items,
				xhrRequest,
				legendTables = [],
				generateLegendTable = args.generateLegendTable,
				tableAddedCallback = args.tableAddedCallback;
		
		var aggergateBins = [];
		
		items.forEach(function (childId, index, allItems) {
			if (!me.destroyed) {
				xhrRequest = CCH.Util.Util.getSLD({
					contextPath: CCH.CONFIG.contextPath,
					itemId: childId,
					context: {
						index: index,
						aggergateBins: aggergateBins,
						allItems: allItems,
						legendTables: legendTables,
						itemId: childId,
						tableAddedCallback: tableAddedCallback,
						generateLegendTable: generateLegendTable
					},
					callbacks: {
						success: [
							function (sld) {
								var $legendTable = -1,
									index = this.index,
									aggergateBins = this.aggergateBins,
									allItems = this.allItems,
									itemId = this.itemId,
									legendTables = this.legendTables,
									total = allItems.length,
									item = null,
									tableAddedCallback = this.tableAddedCallback || me.tableAdded;
							
								if(sld.bins && sld.bins.length > 0){
									aggergateBins = aggergateBins.concat(sld.bins);
								}
								
								if(index === total-1){
									try {
										item = CCH.items.getById({id: itemId});
										sld.bins = aggergateBins;
										$legendTable = this.generateLegendTable.call(me, {
											sld: sld,
											item: item,
											index: index
										});

										// If the procedure didn't create anything for whatever reason, 
										// set the variable to -1
										if (!$legendTable) {
											$legendTable = -1;
										}
									} catch (ex) {
										// Something went wrong but I don't want to error out, so just 
										// warn, keep the variable at -1 and move on
										LOG.warn(ex);
									}

									// Whatever we have at this point, add it to the array
									legendTables.push($legendTable);

									// And call the table added callback to possibly complete the legend
									tableAddedCallback.call(me, {
										legendTables: this.legendTables,
										total: 1,
										item: CCH.items.getById({id: itemId}),
										sld: sld
									});
								}
								
							}
						],
						error: [
							function () {
								if (!me.destroyed) {
									LOG.warn("Could not retrieve SLD. Legend will not be created for this item");
									this.legendTables.push(-1);
									me.tableAdded({
										legendTables: this.legendTables,
										total: this.allItems.length
									});
									if (me.onError) {
										me.onError.call(me, arguments);
									}
								}
							}
						]
					}
				});
				me.ajaxRequests.push(xhrRequest);
			}
		});		
	};

	me.createLegendsFromItems = function (args) {
		args = args || {};
		var items = args.items,
				xhrRequest,
				legendTables = [],
				generateLegendTable = args.generateLegendTable,
				tableAddedCallback = args.tableAddedCallback;
		
		items.forEach(function (childId, index, allItems) {
			if (!me.destroyed) {
				xhrRequest = CCH.Util.Util.getSLD({
					contextPath: CCH.CONFIG.contextPath,
					itemId: childId,
					context: {
						index: index,
						allItems: allItems,
						legendTables: legendTables,
						itemId: childId,
						tableAddedCallback: tableAddedCallback,
						generateLegendTable: generateLegendTable
					},
					callbacks: {
						success: [
							function (sld) {
								var $legendTable = -1,
									index = this.index,
									allItems = this.allItems,
									itemId = this.itemId,
									legendTables = this.legendTables,
									total = allItems.length,
									item = null,
									tableAddedCallback = this.tableAddedCallback || me.tableAdded;
								try {
									item = CCH.items.getById({id: itemId});
									$legendTable = this.generateLegendTable.call(me, {
										sld: sld,
										item: item,
										index: index
									});

									// If the procedure didn't create anything for whatever reason, 
									// set the variable to -1
									if (!$legendTable) {
										$legendTable = -1;
									}
								} catch (ex) {
									// Something went wrong but I don't want to error out, so just 
									// warn, keep the variable at -1 and move on
									LOG.warn(ex);
								}

								// Whatever we have at this point, add it to the array
								legendTables.push($legendTable);

								// And call the table added callback to possibly complete the legend
								tableAddedCallback.call(me, {
									legendTables: this.legendTables,
									total: total,
									item: CCH.items.getById({id: itemId}),
									sld: sld
								});
							}
						],
						error: [
							function () {
								if (!me.destroyed) {
									LOG.warn("Could not retrieve SLD. Legend will not be created for this item");
									this.legendTables.push(-1);
									me.tableAdded({
										legendTables: this.legendTables,
										total: this.allItems.length
									});
									if (me.onError) {
										me.onError.call(me, arguments);
									}
								}
							}
						]
					}
				});
				me.ajaxRequests.push(xhrRequest);
			}
		});
	};

	/**
	 * Returns an array if item ids that are visible children of an aggregation
	 * 
	 * @param {String} itemId
	 * @returns {CCH.Objects.Widget.getAggregationChildrenIds.items|Array}
	 */
	me.getAggregationChildrenIds = function (itemId) {
		var item = CCH.items.getById({id: itemId}),
				childLayers = item.getLayerList(),
				items = [];
		childLayers.layers.forEach(function (layerName) {
			// Possible formats:
			// aggregationId_itemId_r_ribbonIndexInteger (Ribboned, example: C68abcd_C67pzz9_r_1)
			// aggregationId_itemId (Unribboned, example: C68abcd_C67pzz9)
			items.push(layerName.split('_')[1]);
		});
		return items;
	};

	me.generateRangeString = function (ub, lb) {
		if (lb !== undefined && ub !== undefined) { 
			return lb + ' to ' + ub;
		} else if (lb !== undefined && ub === undefined) {
			return '> ' + lb;
		} else if (lb === undefined  && ub !== undefined) {
			return '< ' + ub;
		}
		return '';
	};

	me.tableAdded = function (args) {
		args = args || {};
		var total = args.total,
			legendTables = args.legendTables,
			ribboned = me.item.ribboned || false,
			legendGroups,
			legendGroup,
			firstLegend,
			currentLegend,
			captionSpan,
			currentLegendCaptionText,
			hashKey,
			tableIndex,
			lIdx,
			indexCompare = function (t, index) {
				if($(t).attr('legend-index') === currentLegend.attr('legend-index')) {
					tableIndex = index;
					return true;
				}
			};

		// All legend tables have been attained so now I need to actually slice and dice the collection of tables into
		// a nicely formatted single or set of legend tables
		if (legendTables.length === total) {
			
			// If an upstream call for an SLD for an item returned an error, the
			// item in the legendTables array will be -1 (in order to satisfy matching
			// the total). The call to groupBy will fail if those are still in 
			// the legendTables array, so remove them before moving on. 
			legendTables = legendTables.filter(function (table) { // Remove any array items that are -1
				return table !== -1;
			});

			
			// If I am ribboned, I want to group my legends if they're the same 
			// color range/measures
			legendGroups = {};
			legendTables.forEach(function(lt) {
				var group = $(lt).find('tbody').html().hashCode();
				legendGroups[group] === undefined ? legendGroups[group] = [lt] : legendGroups[group].push(lt);
			});

			for (hashKey in legendGroups) {
				if (legendGroups.hasOwnProperty(hashKey)) {
					// Sort the legend group by the table's legend index attribtue
					legendGroup = legendGroups[hashKey].sort(function (a, b) {
						var aVal = parseInt($(a).attr('legend-index'), 10);
						var bVal = parseInt($(b).attr('legend-index'), 10);
						
						if(aVal < bVal) {
							return -1;
						} else if(aVal > bVal) {
							return 1;
						} else {
							return 0;
						}
					});

					captionSpan = $('<span />').attr('id', 'cch-legend-caption-container');

					firstLegend = legendGroup[0];

					for (lIdx = 0; lIdx < legendGroup.length; lIdx++) {
						currentLegend = legendGroup[lIdx];
						// The items here may be ribboned. If so, I want to mark their caption spans with
						// the id specific to its layer so that I can do things like hide all other layers when a
						// user mouses over the caption
						if (ribboned) {
							currentLegendCaptionText = currentLegend.find('caption').html();
							captionSpan.append($('<span />')
									.addClass('ribboned-legend-caption')
									.attr('ribbon-layer-id', currentLegend.attr('legend-item-id'))
									.html(currentLegendCaptionText), $('<br />'));
						}

						legendTables.some(indexCompare);

						// I only want to display the first table in this group, so don't kill the first table
						if (lIdx !== 0) {
							legendTables[tableIndex] = -1;
						}
					}

					if (!ribboned) {
						firstLegend.find('caption').empty().append($('<span />').html(me.item.summary.legend ? me.item.summary.legend.title : ""));
					} else {
						firstLegend.find('caption').empty().append(captionSpan);
					}

				}
			}

			legendTables = legendTables.filter(function (table) { // Remove any array items that are -1
				return table !== -1;
			});

			total = legendTables.length;

			// When all the tables are created, I want to sort them, append them to a  wrapper and throw that wrapper 
			// into the final container
			// There are no more legends to be built, filter and add the legend to the document
			var legendAttrs = [];
			legendTables = legendTables.filter(function (table) { // Remove any array items that are -1
				var newAttr = true;
				if(table !== -1) {
					newAttr = !legendAttrs.includes($(table).attr('legend-attribute'));
					
					if(newAttr) {
						legendAttrs.push($(table).attr('legend-attribute'));
					}
					
				}
				
				return table !== -1 && newAttr;
			});

			if (legendTables.length === 0) {
				// Remove the container and hyst run the onComplete
				me.hide();
			} else {
				// There were tables, so I want to show them
				if (legendTables.length === 1 && total > 1) {
					// I have one table left after running unique(). However, I started out with multiple tables. This
					// means that the title of this table will be the last table to make it through unique(). If that's the 
					// case, use the title of the parent aggregation for this item
					legendTables[0].find('caption').html(me.item.summary.legend ? me.item.summary.legend.title : "");
				} else {
					// If there's multiple tables, sort them according to index, leaving
					// titles as is
					legendTables = legendTables.sort(function (a, b) {
						return parseInt($(a).attr('legend-index'), 10) - parseInt($(b).attr('legend-index'), 10);
					});
				}

				// Remove the loading text from the legend div and append the legend tables
				me.$legendDiv.empty().append(legendTables);
			}

			if (me.onComplete) {
				me.onComplete.call(me);
				$(window).trigger('legend-tables-added', me);
			}

		}
	};
	/**
	 * Hides the legend div
	 * 
	 * @returns {$} the jQuery dom container for this legend
	 */
	me.hide = function () {
		me.$legendDiv.addClass('hidden');
		return me.$legendDiv;
	};
	/**
	 * Shows the legend div
	 * 
	 * @returns {$} the jQuery dom container for this legend
	 */
	me.show = function () {
		me.$legendDiv.removeClass('hidden');
		return me.$legendDiv;
	};
	/**
	 * Marks this widget as being destroyed. Cancels all outgoing ajax requests and removes its container
	 * 
	 * @returns {CCH.Objects.Widget.Legend.me|@exp;CCH@pro;Objects@pro;Widget|CCH.Objects.Widget}
	 */
	me.destroy = function () {
		me.destroyed = true;
		me.ajaxRequests.forEach(function (req) {
			req.abort();
		});
		me.$legendDiv.remove();
		return me;
	};
	
	// Verify that everything we need was passed in and create the item. Otherwise, error out.
	if (!me.containerId) {
		throw me.errorMessage.replace('%s', 'Argument "containerId" was not provided.');
	} else if (!me.item) {
		throw me.errorMessage.replace('%s', 'Argument "item" was not provided.');
	} else {
		return {
			init: me.init
		};
	}

};

(function () {
	"use strict";
	function assignToTemplate(name) {
		return function (data) {
			if (!CCH.Objects.Widget.Legend.prototype.templates) {
				CCH.Objects.Widget.Legend.prototype.templates = {};
			}
			CCH.Objects.Widget.Legend.prototype.templates[name] = Handlebars.compile(data);
		};
	};
	
	var nameToPath = {
		rts_legend: 'real_time_storms.html',
		continuous: 'continuous.html'
	};
	Object.keys(nameToPath).forEach(function(name){
		var path = nameToPath[name];
		$.ajax({
			url: CCH.CONFIG.contextPath + '/resource/template/handlebars/legend/' + path,
			success: assignToTemplate(name),
			error: function () {
				window.alert('Unable to load resources required for a functional publication page. Please contact CCH admin team.');
			}
		});
	});
	
})();
