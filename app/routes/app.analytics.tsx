import React, { useState } from "react";
import { MoonIcon, SunIcon } from "@shopify/polaris-icons";
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  Pie,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Radar,
  Cell,
} from "recharts";
import { LoaderFunctionArgs } from "@remix-run/node";
import { analyticsEventEmitter } from "app/eventsEmitter/eventEmitter";
import { Button, Icon, Page } from "@shopify/polaris";
import { getAllProducts } from "app/helper/productHelper";
import { authenticate } from "app/shopify.server";
import Chart from "app/components/Chart";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  analyticsEventEmitter.on("VIDEO_CLICK", (productId, count) => {
    console.log(`Product id ${productId} updated the count by ${count}`);
  });
  const products = await getAllProducts(admin);
  const productData = products.map(({ node }: any) => ({
    name: node.title,
    count: node?.metafield === null ? 0 : node.metafield?.jsonValue?.count || 0,
  }));

  return {
    productData,
  };
};
interface LoaderData {
  productData: any[];
  videoData: any[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-3 border border-gray-200">
        <p className="text-gray-700 font-semibold text-lg">{label}</p>
        <p className="text-blue-600 text-md">{`${payload[0].name}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const videoData = [
  { name: "Video X", clicks: 20 },
  { name: "Video Y", clicks: 30 },
  { name: "Video Z", clicks: 50 },
  { name: "Video A", clicks: 40 },
  { name: "Video B", clicks: 80 },
  { name: "Video C", clicks: 100 },
  { name: "Video D", clicks: 90 },
];
const productData = [
  { name: "Product A", Cart: 50 },
  { name: "Product B", Cart: 70 },
  { name: "Product C", Cart: 90 },
  { name: "Product D", Cart: 60 },
  { name: "Product E", Cart: 100 },
  { name: "Product F", Cart: 120 },
  { name: "Product G", Cart: 140 },
];
const segmentColors = [
  "#FF5733",
  "#FF8C00",
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#FFC107",
];

const getPieSegmentColor = (entry: any, index: any) => {
  return segmentColors[index % segmentColors.length];
};
const Analytics = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Product Sales Overview (Bar Chart)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Cart" fill="#4CAF50" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Video Engagement Overview */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Video Engagement Overview (Bar Chart)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={videoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="clicks" fill="#FF5733" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart */}
      <div className="bg-white shadow-lg rounded-xl p-6 mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Product Sales Trend (Line Chart)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={productData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#8884d8" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Cart" stroke="#4CAF50" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-white shadow-lg rounded-xl p-6 mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Video Engagement Distribution (Pie Chart)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={videoData}
              dataKey="clicks"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label
            >
              {/* Dynamically assign colors to the segments */}
              {videoData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getPieSegmentColor(entry, index)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="min-h-screen bg-gray-100 p-8">
        {/* Product vs Video Engagement (Radar Chart) */}
        <div className="bg-white shadow-lg rounded-xl p-6 mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Product vs Video Engagement (Radar Chart)
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart
              outerRadius="80%"
              width={730}
              height={350}
              data={[
                { name: "Product A", product: 50, video: 20 },
                { name: "Product B", product: 70, video: 30 },
                { name: "Product C", product: 90, video: 50 },
                { name: "Product D", product: 60, video: 40 },
                { name: "Product E", product: 100, video: 80 },
                { name: "Product F", product: 120, video: 100 },
                { name: "Product G", product: 140, video: 90 },
              ]}
            >
              {/* Polar grid with subtle lines */}
              <PolarGrid strokeDasharray="3 3" />
              {/* Angled axes with labels */}
              <PolarAngleAxis dataKey="name" stroke="#4B5563" />
              {/* Radius axis */}
              <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#4B5563" />
              {/* Tooltip for hover */}
              <Tooltip />
              {/* Legend for radar */}
              <Legend />
              {/* Radar Chart for Product */}
              <Radar
                name="Product"
                dataKey="product"
                stroke="#4CAF50"
                fill="#4CAF50"
                fillOpacity={0.6}
              />
              {/* Radar Chart for Video */}
              <Radar
                name="Video"
                dataKey="video"
                stroke="#FF5733"
                fill="#FF5733"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
