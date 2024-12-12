const VideoCarousel = ({ videoUrls }: any) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {videoUrls?.map((url: string, i: number) => (
        <div key={i} className="overflow-hidden  rounded-lg shadow-lg">
          <video
            controls
            loop
            muted
            autoPlay
            className="w-full h-auto object-cover rounded-lg"
          >
            <source src={url} type="video/mp4" />
          </video>
        </div>
      ))}
    </div>
  );
};

export default VideoCarousel;
