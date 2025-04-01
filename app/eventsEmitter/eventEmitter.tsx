import EventEmitter from "events";
class AnalyticsEventEmitter extends EventEmitter {}
const analyticsEventEmitter = new AnalyticsEventEmitter();
export { analyticsEventEmitter };
