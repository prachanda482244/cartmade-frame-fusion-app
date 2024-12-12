import { useNavigate } from "@remix-run/react";
import React from "react";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-300 min-h-screen flex flex-col items-center font-sans">
      {/* Header Section */}
      <header className="w-full py-16 text-center bg-gradient-to-r from-blue-600 to-blue-800 text-white relative">
        <h1 className="text-5xl font-extrabold tracking-wide leading-tight mb-6">
          Ultimate Video Carousel Experience
        </h1>
        <p className="text-lg font-light max-w-3xl mx-auto mb-8">
          Discover the next-gen video carousel that offers seamless integration
          with product tiles, customizable features, and dynamic visual ratios
          to enhance your e-commerce platform.
        </p>
      </header>

      {/* Features Section */}
      <section className="w-full py-20 bg-gray-50">
        <h2 className="text-3xl font-semibold text-center text-gray-800 mb-16">
          Key Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 px-4">
          {[
            {
              title: "Customizable Borders",
              description:
                "Enable simple borders around your videos and customize their color and width.",
            },
            {
              title: "Dynamic Aspect Ratios",
              description:
                "Center videos in a 9x16 ratio, while all other videos maintain a 4x5 ratio for a balanced view.",
            },
            {
              title: "Muted Playback",
              description:
                "Videos automatically play muted, ensuring a distraction-free experience.",
            },
            {
              title: "Quick Add-to-Cart",
              description:
                "Enable users to quickly add products to their cart directly from the video carousel.",
            },
            {
              title: "Editable Product Tiles",
              description:
                "Customize product tiles with editable names, images, and vendor details, and easily pull in pricing information.",
            },
            {
              title: "Automatic Pricing Integration",
              description:
                "Product tiles pull in accurate pricing in real time, so users always see the latest price.",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg transition-transform duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <h3 className="text-2xl font-medium text-gray-800 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-lg text-center">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="mt-20 py-16 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center relative rounded-lg">
        <h2 className="text-4xl font-bold mb-6">
          Start Your Video Carousel Journey
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Seamlessly integrate product videos with your store while offering a
          visually stunning, customizable experience that drives engagement and
          conversions.
        </p>
        <button
          onClick={() => navigate("/app/video-settings")}
          className="bg-white text-blue-700 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
        >
          Get Started
        </button>
        {/* <div className="absolute -bottom-12 -left-12 opacity-80">
          <img
            src="https://plus.unsplash.com/premium_photo-1679079456083-9f288e224e96?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Tech Background"
            className="rounded-full w-24 h-24"
          />
        </div> */}
      </section>

      {/* Footer Section */}
      <footer className="mt-24 py-8 bg-gray-800 text-center text-white">
        <p className="text-sm">
          &copy; 2024 Video Carousel Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;
