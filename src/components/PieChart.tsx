import React, { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CARD_MARGIN_H = 20;
const CARD_PADDING = 20;

const CHART_WIDTH = SCREEN_WIDTH - (CARD_MARGIN_H * 2) - (CARD_PADDING * 2);
const CHART_HEIGHT = 190;

const GREEN = "#22C55E";

type ActivityItem = {
  title: string;
  saved_amount: number;
  date: string;
};

type Props = {
  title?: string;
  data?: number[];
  range?: "30d" | "90d";
  activityData?: ActivityItem[];
};

const PriceChart = ({
  title = "Price History",
  data,
  range = "30d",
  activityData,
}: Props) => {

  // Build chart data from activityData if available, else fallback to dummy
  const { chartData, xLabels } = useMemo(() => {
    // If real activity data exists, use it
    if (Array.isArray(activityData) && activityData.length > 0) {
      // Group by date and sum saved_amount per day
      const grouped: Record<string, number> = {};
      activityData.forEach((item) => {
        const key = item.date || "Unknown";
        grouped[key] = (grouped[key] || 0) + item.saved_amount;
      });

      const dates = Object.keys(grouped);
      const amounts = dates.map((d) => grouped[d]);

      // If only 1 point, duplicate to avoid chart crash
      const safeAmounts = amounts.length === 1 ? [0, ...amounts] : amounts;
      const safeDates = dates.length === 1 ? ["", ...dates] : dates;

      // Pick up to 4 labels spread across the data
      const n = safeDates.length;
      const labelIndices = [
        0,
        Math.floor(n * 0.33),
        Math.floor(n * 0.66),
        n - 1,
      ];
      const labels = safeDates.map((d, i) =>
        labelIndices.includes(i) ? d : ""
      );

      // x-axis bottom labels (4 labels)
      const xLabelTexts = [
        safeDates[0] ?? "",
        safeDates[Math.floor(n * 0.33)] ?? "",
        safeDates[Math.floor(n * 0.66)] ?? "",
        safeDates[n - 1] ?? "",
      ];

      return { chartData: safeAmounts, xLabels: xLabelTexts };
    }

    // Fallback: dummy data based on range
    const dummy30 = [
      0.5, 1.2, 0.8, 2.1, 1.5, 3.0, 2.4, 1.8, 2.9, 3.5,
      2.7, 4.0, 3.2, 3.8, 4.5, 3.9, 5.1, 4.7, 5.5, 4.9,
      6.0, 5.4, 6.3, 5.8, 6.7, 6.1, 6.89, 7.2, 6.5, 6.89,
    ];
    const dummy90 = [
      0.3, 0.8, 0.6, 1.2, 1.0, 1.8, 1.5, 2.2, 1.9, 2.7,
      2.4, 3.1, 2.8, 3.5, 3.2, 3.9, 3.6, 4.3, 4.0, 4.7,
      4.4, 5.1, 4.8, 5.5, 5.2, 5.9, 5.6, 6.3, 6.0, 6.7,
      6.4, 7.1, 6.8, 7.5, 7.2, 7.9, 7.6, 8.3, 8.0, 8.7,
      8.4, 9.1, 8.8, 9.5, 9.2, 9.9, 9.6, 10.3, 10.0, 10.7,
      10.4, 11.1, 10.8, 11.5, 11.2, 11.9, 11.6, 12.3, 12.0, 12.7,
      12.4, 13.1, 12.8, 13.5, 13.2, 13.9, 13.6, 14.3, 14.0, 14.7,
      14.4, 15.1, 14.8, 15.5, 15.2, 15.9, 15.6, 16.3, 16.0, 16.7,
      16.4, 17.1, 16.8, 17.5, 17.2, 17.9, 17.6, 18.3, 18.0, 18.7,
    ];

    const raw = range === "90d" ? dummy90 : dummy30;
    const n = raw.length;
    const xLabelTexts =
      range === "30d"
        ? ["Day 1", "Day 10", "Day 20", "Day 30"]
        : ["Month 1", "Month 1.5", "Month 2", "Month 3"];

    return { chartData: raw, xLabels: xLabelTexts };
  }, [activityData, range, data]);

  const chartLabels = useMemo(() => {
    const n = chartData.length;
    const idx0 = 0;
    const idx1 = Math.floor(n * 0.33);
    const idx2 = Math.floor(n * 0.66);
    const idx3 = n - 1;
    return chartData.map((_, i) => {
      if (i === idx0 || i === idx1 || i === idx2 || i === idx3) return " ";
      return "";
    });
  }, [chartData]);

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: "#FFFFFF",
      backgroundGradientTo: "#FFFFFF",
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      labelColor: () => "rgba(107, 114, 128, 1)",
      strokeWidth: 3,
      propsForBackgroundLines: {
        strokeDasharray: "6 6",
        stroke: "#D1D5DB",
        strokeWidth: 1,
      },
      fillShadowGradientFrom: GREEN,
      fillShadowGradientTo: GREEN,
      fillShadowGradientFromOpacity: 0.2,
      fillShadowGradientToOpacity: 0.0,
      propsForDots: { r: "0" },
      decimalPlaces: 2,
    }),
    []
  );

  return (
    <View style={styles.card}>
      <View style={styles.chartWrap}>
        <LineChart
          data={{
            labels: chartLabels,
            datasets: [
              {
                data: chartData,
                color: () => GREEN,
                strokeWidth: 3,
              },
            ],
            legend: [],
          }}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          chartConfig={chartConfig}
          bezier={true}
          withDots={false}
          withShadow={true}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={false}
          withHorizontalLabels={false}
          segments={2}
          transparent={true}
          style={styles.chart}
        />
      </View>

      {/* Bottom x-axis labels */}
      <View style={styles.xLabels}>
        {xLabels.map((label, i) => (
          <Text key={i} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default PriceChart;

const styles = StyleSheet.create({
  card: {},
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  chart: {
    paddingRight: 0,
    paddingLeft: 0,
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
});