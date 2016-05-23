
// https://rally1.rallydev.com

var QueryString = function () {
  // This function is anonymous, is executed immediately and 
  // the return value is assigned to QueryString!
  var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
        // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = decodeURIComponent(pair[1]);
        // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
      query_string[pair[0]] = arr;
        // If third or later entry with this name
    } else {
      query_string[pair[0]].push(decodeURIComponent(pair[1]));
    }
  } 
    return query_string;
}();

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

	
	items : [
	  { 
	  	id : 'panel',
	    xtype : 'container',
	    margin : '5 5 5 5',
	    items : [
		{
              id: 'summaryPie',
              xtype: 'container',
              margin : '5 5 5 5',
              frame : false
      	},
  		{
              id: 'summaryGrid',
              xtype: 'container',
              margin : '5 5 5 5',
              frame : false
      	},
      	{
      		xtype: 'panel',
      		frame : false,
      		margin : '5 5 5 5',
      		items : [ 
      		  {
              xtype: 'textfield',
              margin: "5 5 5 5",
              fieldLabel: 'Search',
  	    			id : 'searchText'
      			}, {
      			  margin : "5 5 5 5",
      				xtype : 'container',
      				id : 'searchGrid'
      			}
      		]
      	}
    	]
	  }
	],

	fields : [
		{
			displayName : 'Subscription',
			name : 'sub'
		},
		// {
		// 	displayName: 'Total',
		// 	name: 'total'
		// },
		{
			displayName: 'Enabled',
			name: 'enabled'
		},
		// {
		// 	displayName: 'Disabled',
		// 	name: 'disabled'
		// },
		{
			displayName: 'LoggedIn90',
			name: 'loggedIn90'
		}
	],

    loadFromStorage : function(keys) {
    	var data = _.map(keys,function(key) {
    		var ls = localStorage.getItem(key);
			if ( !_.isUndefined(ls) && !_.isNull(ls) ) {
				return JSON.parse(ls);
			}
			return null;
    	});
    	return data;
    },

    loggedIn90 : function( user ) {
    	// console.log(user, Date.parse(user.LastLoginDate));
    	if (_.isNull(user.LastLoginDate))
    		return false;
    	var dt = Rally.util.DateTime.getDifference( new Date(), new Date(user.LastLoginDate), 'day' );
    	return dt <= 90;
    },

    summarizeData : function(records) {
    	var that = this;
		return {
			total    : records.length,
			enabled  : _.filter(records,function(r){return r.Disabled===false;}).length,
			disabled : _.filter(records,function(r){return r.Disabled===true;}).length,
			loggedIn90 : _.filter(records,function(r){return that.loggedIn90(r);}).length
		}
	},

    showInGrid : function(data) {

    	var that = this;

    	var storeData = _.map(data,function(d){
    		var summary = that.summarizeData(d.records);
    		summary.sub = d.sub;
    		return summary;
    	});

		that.fields.push({
			name: 'PctEnabled', 
			type: 'number',
			displayName : '% of Enabled',
			convert : function(val,row) {
				var x = (row.get("enabled") > 0) ? (row.get("loggedIn90") / row.get("enabled"))*100 : 0;
				return Math.round(x);
			}
		});

		that.store = Ext.create('Ext.data.JsonStore', {
        	fields : that.fields,
        	data : storeData
		});

		var cols = _.map( that.fields,function(f) {
			return {
				text: f.displayName,
            	dataIndex: f.name
			}
		});
		cols[0].width = 200;
		cols[1].summaryType = 'sum';
		cols[2].summaryType = 'sum';

		// summaryType: 'count',

		var grid = new Ext.grid.GridPanel({
			store : that.store,
			columns : cols,
			width:550,
			features: [
				{ftype: 'grouping',  showSummaryRow: true, groupHeaderTpl: ' {name}'},
				{ftype: 'summary'}
			]
		});
		Ext.getCmp('summaryGrid').add(grid);

    },


     searchGrid : function(data) {

    	var that = this;

    	var searchStoreData = _.flatten(_.map(data,function(d){
    		return _.map(d.records,function(r){
    			return {
    				subscription : d.sub,
    				user : r.UserName
    			}
    		});
    	}));
    	console.log("searchStoreData",searchStoreData);

    	var fields = [ { name : 'user' }, { name : 'subscription' } ];

		that.searchStore = Ext.create('Ext.data.JsonStore', {
        	fields : fields,
        	data : searchStoreData
		});

		var searchGrid = new Ext.grid.GridPanel({
			store : that.searchStore,
			columns : 
			  [ { text : 'UserName', dataIndex : 'user', width : 250,autoSizeColumn: true},
			    { text : 'Subscription', dataIndex : 'subscription', width : 250, autoSizeColumn: true}
			  ],
			width:550,
			height:300
		});
		Ext.getCmp('searchGrid').add(searchGrid);
    },


	createChart : function() {

		var that = this;
		
		chart = new Ext.chart.Chart({
	        width: 550,
	        height: 170,
	        animate: true,
	        store: that.store,
	        legend: {
	            position: 'right'
	        },
	        insetPadding: 25,
	        theme: 'Base:gradients',
	        series: [{
	        	label: {
	                field: 'sub',
	                // display: 'rotate',
	                // contrast: true,
	                // font: '18px "Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif'
            	},
	        	// colorSet: ["#80cc33", "#cccc33", "#cc5933"],
	            type: 'pie',
	            field: 'enabled',
	            showInLegend: true,
	            highlight: {
	              segment: {
	                margin: 20
	              }
	            },
	            animate: true
	        }]
	    });
	    
	    Ext.getCmp('summaryPie').add(chart);
		
	},


    launch: function() {
    	var that = this;
    	console.log(QueryString.apiKeys);
    	Ext.getCmp('panel').setTitle("All Subscriptions");
    	var keyString = QueryString.apiKeys;
    	var keys = keyString.split(",");
    	var data = this.loadFromStorage(keys);
    	console.log("data",data);
    	this.showInGrid(data);
    	this.searchGrid(data);
    	this.createChart();

    	Ext.getCmp('searchText').addListener('change',
    		function(obj,newValue,oldValue,opts) {
    			that.searchStore.clearFilter(true);
    			that.searchStore.filterBy(function(record){
    				return record.get("user").toLowerCase().indexOf(newValue.toLowerCase()) !== -1;
    			})
    		});
    }
});
