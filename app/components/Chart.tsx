import HighchartsReact from "highcharts-react-official";
import React from "react";

const Chart = ({ Highcharts, productOptions }: any) => {
  return <HighchartsReact highcharts={Highcharts} options={productOptions} />;
};

export default Chart;
