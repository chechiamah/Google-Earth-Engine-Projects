
/* 
Title: Image Direct Measurements
Author: Chechi Amah 
Date: December 12th, 2024
[Objective:] Study the correlation between LST and NDVI overall and in various 
              land cover types over time in the metropolitan city of Atlanta 
              in Fulton County. 
*/

//----------------------------------------------------------------------//

// Import level 1 admistrative boundaries
var gbl2 = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2");

//Find Number of administrative districts called "Fulton" in the system
print(gbl2.filter(ee.Filter.eq('ADM2_NAME','Fulton')).size(), 'No. of Fultons in the world');

//Select Fulton County that contains the Atlanta Metropolitan Area
var atlGeom = ee.Feature(gbl2
    .filter(ee.Filter.eq('ADM1_NAME','Georgia'))
    .filter(ee.Filter.eq('ADM2_NAME','Fulton'))
    .first()
  )
  //Set as geometry
    .geometry();
    
    
//Center the Atlanta geometry 
Map.centerObject(atlGeom, 10);

//Name, color, and opacity of Atlanta Layer
Map.addLayer(atlGeom, {color: 'purple'}, 'City Boundary', true, 0.5);

//NDVI and LST 

// This function adds NDVI as a new band to each image in the collection
function addNdvi(image) { 
  var ndvi = image.expression(
    // NDVI equation
    '(NIR - RED) / (NIR + RED)', 
    // Dictionary for bands involved
    {
      //Define NIR Band
      'NIR': image.select('SR_B5'),
      //Define Red Band
      'RED': image.select('SR_B4')
    }
  )
  //Scale NDVI by 100 to be visible in LST and NDVI chart
  .multiply(100)
  // Change the name of newly generated image band to NDVI
  .rename('NDVI');
  
  //Add NDVI image to band
  return image
    .addBands(ndvi);
}

// This function adds LST (Land Surface Temperature) as a new band to each image in the collection
function addLST(image){
  var lst = image
  
  //Select Thermal Infrared Band
  .select('ST_B10')
  
  //Multiply by Scaling Factor
  .multiply(0.00341802)
  
  //DN to Kelvin
  .add(149.0)
  
  //Kelvin to Celsius
  .subtract(273)
  
  // Change the name of newly generated image band to LST
  .rename('LST');
  
  //Add LST image to band
    return image
    .addBands(lst);
}

//Conditional for Landsat image collection
var landsatCollection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(atlGeom)  //Filter to Atlanta Metro Area (Fulton County)
  .filterDate('2014-01-01', '2023-12-31') //Set the time to a decade 
  .filter(ee.Filter.lt('CLOUD_COVER', 15))  //Limit cloud cover to less than 15%
  .map(addNdvi)   //Apply addNdvi to image collection
  .map(addLST);  //Apply addLST to image collection
  
//Print the size of the coillection and a checkpoint 
print("size of image collection:", landsatCollection.size());

//MEDIAN COMPOSITES

//True Color image
var trueColorImage = landsatCollection.select(['SR_B4','SR_B3', 'SR_B2' ]).median().clip(atlGeom);
//NDVI image
var ndviImage = landsatCollection.select('NDVI').median().clip(atlGeom);
//LST image
var lstImage = landsatCollection.select('LST').median().clip(atlGeom);

//VISUAL PARAMETERS

//Define True Color visualization paramters
var trueColorVisParams = { 
  min: 0, 
  max: 30000, 
  gamma: 1.4
};

//Define NDVI visualization paramters
var ndviVisParams = { 
  //Visual is Adjusted by a Scale of 100 for visual representation. 
  //Original values -1 and 1
  min: -100, 
  max: 100, 
  palette:['blue', 'white', 'green']
};

//Define LST visualization paramters
var lstVisParams =   {
    min: 18, // Minimum LST value
    max: 42, // Maximum LST value
    palette: [
      '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
      '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
      '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
      'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
      'ff0000', 'de0101', 'c21301', 'a71001', '911003'
    ]
  };

//MAP LAYERS

//True Color Composite Layer
Map.addLayer(trueColorImage,trueColorVisParams, 'True Color Composite', true);
//NDVI Composite Layer
Map.addLayer(ndviImage,ndviVisParams, 'NDVI Composite', false);
//LST Composite Layer
Map.addLayer(lstImage,lstVisParams, 'LST Composite', false);

//----------------------------------------------------------------------//

// NDVI and LST TREND CHART: Whole Atlanta Metro Area

var atlTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: atlGeom,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Atlanta Metro Area',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    }); 
print(atlTrnd); 

//CORRELATION CHART: Whole Atlanta Metro Area
var correlChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: atlGeom, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST for Atlanta Metro Area from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(correlChart); 

// NDVI and LST TREND CHART: Urban Areas

var urbanTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: urban,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Urban Areas',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    });
print(urbanTrnd);

//CORRELATION CHART: Urban Areas
var urbanCorrelChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: urban, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST for Urban Areas from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(urbanCorrelChart); 

//----------------------------------------------------------------------//

// NDVI and LST TREND CHART: Residential Areas

var resAreaTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: resArea,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Residential Areas',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    }); 
print(resAreaTrnd); 

//CORRELATION CHART: Residential Areas
var resAreaCorrelChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: resArea, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST for Residential Areas from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(resAreaCorrelChart); 

//----------------------------------------------------------------------//

// NDVI and LST TREND CHART: Highways

var highwaysAreaTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: highways,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Highways',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    }); 
print(highwaysAreaTrnd); 

//CORRELATION CHART: Highways
var highwaysCorrelChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: highways, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST in Highways from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(highwaysCorrelChart); 

//----------------------------------------------------------------------//

// NDVI and LST TREND CHART: Commercial Areas

var commercialAreaTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: commercial,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Commercial Areas from 2014 to 2023',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    }); 
print(commercialAreaTrnd); 

//CORRELATION CHART: Commercial Areas
var commercialCorrelChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: commercial, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST in Commercial Areas from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(commercialCorrelChart); 

//----------------------------------------------------------------------//

// NDVI and LST TREND CHART: Vegetated Areas

var vegetatedAreaTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: vegetation,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Vegetated Areas',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    }); 
print(vegetatedAreaTrnd); 

//CORRELATION CHART: Vegetated Areas
var vegetatedAreaCorrelChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: vegetation, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST in Vegetated Areas from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(vegetatedAreaCorrelChart); 

//----------------------------------------------------------------------//

// NDVI and LST TREND CHART: Waterbodies

var waterbodiesAreaTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: waterbodies,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Waterbodies',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    }); 
print(waterbodiesAreaTrnd); 

//CORRELATION CHART: Waterbodies
var waterbodiesAreaCorrelChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: waterbodies, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST in Waterbodies from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(waterbodiesAreaCorrelChart); 

//----------------------------------------------------------------------//

// NDVI and LST TREND CHART: Bare Soil

var bareSoilAreaTrnd =
  ui.Chart.image
    .series({
      imageCollection: landsatCollection.select('NDVI', 'LST'),
      region: bareSoil,
      reducer: ee.Reducer.mean(),
      scale: 500,
      xProperty: 'system:time_start'
    })
    .setSeriesNames(['LST', 'NDVI'])
    .setOptions({
      title: 'Average LST and NDVI by Date for Bare Soil',
      hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
      vAxis: {
        title: 'LST(in Celsius) & NDVI (x1e2) values',
        titleTextStyle: {italic: false, bold: true}
      },
      lineWidth: 5,
      colors: ['e37d05', '1d6b99'],
      curveType: 'function'
    }); 
print(bareSoilAreaTrnd); 

//CORRELATION CHART: Bare Soil
var bareSoilAreaCorrelChart = ui.Chart.image.series({
  imageCollection: landsatCollection.select(['LST', 'NDVI']), 
  region: bareSoil, 
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale:30,
}).setOptions({
  title: 'Correlation Between NDVI and LST in Bare Soil from 2014 to 2023',
  hAxis: {title: 'Year'}, 
  vAxis: {title: 'Correlation Coefficient'}, 
  series: {
    0: {color: 'purple'}
  }
}); 
print(bareSoilAreaCorrelChart); 

//----------------------------------------------------------------------//

/* 
REFLECTION

HYPOTHESIS: 
--> Higher the NDVI values correspond to lower LST temperatures due to the 
    cooling effect of vegetation presence and growth.
--> Conversely, lower the NDVI values will correspond to higher LST temperatures. 


KEY QUESTIONS: 
  Do you think a concurrent correlation study is appropriate? 
  If not how much lag do you think you should add to the analysis and which 
  variable is the preceding one?

--> I think a few months of lag is appropriate when conducting this analysis. 
    NDVI would precede temperature change due to the cooling nature of vegetation
    as a result of its growth over time. 

  Do you think the correlation will be high throughout the entire decade 
  or a high fluctuation will be the more probable outcome?

--> High fluctuation is the more probable outcome. Variables like chnages in land 
    cover, changes like urban sprawl climate events can greatly disrupt patterns. 

  What other variables do you think you can perform correlations on to 
  provide with scientific or practical insights?

--> Correlating rainfall, soil moisture, and land cover changes with both 
    LST and NDVI separately and together would provide more insight into 
    their relationships. 


NOTES ON LAND COVER TYPES: 
1. Urban Areas, Commercial Areas, Highways, and Bare Soil
    NDVI values: lower in high concrete, high density building areas
    LST values: temp. higher especially in summer when UHI retain more heat
    
2. Residential Areas
    NDVI values: more moderate level in areas with more trees
    LST values: temp. lower than dense building areas with fewer trees
    
3. Vegetated Areas
    NDVI values: more moderate to high level in areas with more trees
    LST values: temp. much lower than dense building areas that have fewer trees

4. Waterbodies
    NDVI values: near-zero values
    LST values: comparable to vegetated areas
*/