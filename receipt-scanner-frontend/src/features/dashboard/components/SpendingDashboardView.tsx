import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReceiptApiResponse } from "../../../shared/types/receipt";

type SpendingDashboardViewProps = {
  receiptsLoading: boolean;
  receiptsError: string | null;
  receipts: ReceiptApiResponse[];
};

type ChartType = "bar" | "pie";

type CategoryTotal = {
  name: string;
  total: number;
};

const chartColors = ["#357266", "#f1b24a", "#4a6fa5", "#e07a5f", "#7a9e7e", "#b56576"];
const discountCategoryName = "discount";

const addDays = (source: Date, days: number) => {
  const next = new Date(source);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);

const parseStartDate = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseEndDate = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function SpendingDashboardView({ receiptsLoading, receiptsError, receipts }: SpendingDashboardViewProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [startDate, setStartDate] = useState(() => formatDateInput(addDays(new Date(), -30)));
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));

  const parsedStartDate = useMemo(() => parseStartDate(startDate), [startDate]);
  const parsedEndDate = useMemo(() => parseEndDate(endDate), [endDate]);

  const isRangeValid = Boolean(
    parsedStartDate && parsedEndDate && parsedStartDate.getTime() <= parsedEndDate.getTime(),
  );

  const receiptsInRange = useMemo(() => {
    if (!isRangeValid || !parsedStartDate || !parsedEndDate) {
      return [];
    }

    return receipts.filter((receipt) => {
      const purchaseDate = new Date(receipt.purchaseDateTime);
      if (Number.isNaN(purchaseDate.getTime())) {
        return false;
      }

      return purchaseDate >= parsedStartDate && purchaseDate <= parsedEndDate;
    });
  }, [isRangeValid, parsedStartDate, parsedEndDate, receipts]);

  const { totalsByCategory, discountTotal } = useMemo(() => {
    const totals = new Map<string, number>();
    let discountSum = 0;

    receiptsInRange.forEach((receipt) => {
      receipt.lines.forEach((line) => {
        const quantity = Number(line.quantity);
        const unitPrice = Number(line.unitPrice);
        const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
        const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
        const label = line.category?.name ?? "Uncategorized";
        if (label.toLowerCase() === discountCategoryName) {
          discountSum += safeQuantity * safeUnitPrice;
          return;
        }
        const lineTotal = safeQuantity * safeUnitPrice;
        totals.set(label, (totals.get(label) ?? 0) + lineTotal);
      });
    });

    const totalsByCategory = Array.from(totals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return { totalsByCategory, discountTotal: discountSum };
  }, [receiptsInRange]);

  const currencies = useMemo(() => {
    const values = new Set<string>();
    receiptsInRange.forEach((receipt) => {
      if (receipt.currency) {
        values.add(receipt.currency);
      }
    });
    return values;
  }, [receiptsInRange]);

  const mixedCurrencies = currencies.size > 1;

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Spending dashboard</Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "center" }}>
        <TextField
          label="Start date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="End date"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <ToggleButtonGroup
          color="primary"
          value={chartType}
          exclusive
          onChange={(_, nextValue) => {
            if (nextValue) {
              setChartType(nextValue);
            }
          }}
          size="small"
        >
          <ToggleButton value="bar">Bar chart</ToggleButton>
          <ToggleButton value="pie">Pie chart</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {receiptsLoading ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={18} />
          <Typography color="text.secondary">Loading receipts...</Typography>
        </Stack>
      ) : null}

      {receiptsError ? <Alert severity="error">{receiptsError}</Alert> : null}

      {!receiptsLoading && !receiptsError && !isRangeValid ? (
        <Alert severity="warning">Start date must be earlier than end date.</Alert>
      ) : null}

      {!receiptsLoading && !receiptsError && isRangeValid && totalsByCategory.length === 0 ? (
        <Alert severity="info">No items found for this time range.</Alert>
      ) : null}

      {!receiptsLoading && !receiptsError && mixedCurrencies ? (
        <Alert severity="warning">
          Multiple currencies detected in this range. Totals are shown as mixed values.
        </Alert>
      ) : null}

      {!receiptsLoading && !receiptsError && isRangeValid && totalsByCategory.length > 0 ? (
        <Box sx={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={totalsByCategory} margin={{ top: 12, right: 16, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                <Bar dataKey="total" fill={chartColors[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={totalsByCategory}
                  dataKey="total"
                  nameKey="name"
                  outerRadius={110}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {totalsByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(value) => Number(value).toFixed(2)} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </Box>
      ) : null}

      {!receiptsLoading && !receiptsError && discountTotal !== 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
          Discount items are not listed on this dashboard. Total discounts in selected time interval: {discountTotal.toFixed(2)}.
        </Typography>
      ) : null}
    </Stack>
  );
}
