import { useState } from "react";
import { XIcon } from "@shopify/polaris-icons";
import { Icon, Spinner } from "@shopify/polaris";
const DeleteModal = ({ active, onClose, onDelete }: any) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onDelete();
      onClose();
    }, 2000);
  };

  const handleBackDropClick = () => {
    onClose();
  };
  return (
    <>
      {active && (
        <div
          onClick={handleBackDropClick}
          className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-[999]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-96 shadow-lg"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Delete</h2>
              <button onClick={onClose}>
                <Icon source={XIcon} tone="critical" />
              </button>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center space-x-2">
                  <Spinner size="large" />
                </div>
              ) : (
                <div className="flex  items-center space-x-2">
                  <span className="text-gray-600">
                    Are you sure you want to delete?
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className={`px-4 py-2 rounded-lg ${
                  loading
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteModal;
