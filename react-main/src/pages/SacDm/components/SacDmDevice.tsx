import Chart from "react-apexcharts";
import { SacDmProps } from "../../SacDm/types";
import { EmptyData } from "../../../components/EmptyData";
import React, { useCallback, useEffect, useState } from "react";
import { SacDmDefaultProps } from "../../../types";
import sacDmDefault from "../../../app/services/sacdm_default";
import { Divider, Section, containerStyle, statusBoxStyle, statusOkStyle, statusFailStyle } from "../styles";

export const SacDmDevice = ({
  deviceId,
  sacDm,
}: {
  deviceId: number;
  sacDm: SacDmProps[];
}) => {
  const [sacDmMean, setsacDmMean] = useState<SacDmDefaultProps>();

  const loadSacDmDefault = useCallback(async () => {
    try {
      const response = await sacDmDefault.getSacDmDefault(deviceId);
      setsacDmMean(response);
    } catch (error) {
      console.error(error);
    }
  }, [deviceId]);

  useEffect(() => {
    loadSacDmDefault();

    const interval = setInterval(() => {
      loadSacDmDefault();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadSacDmDefault]);

  if (!deviceId) {
    return null;
  }

  const checkDataStatus = () => {
    return "Falha";
  };

  const calculateDynamicLimits = (data: number[], mean: number, stdDev: number) => {
    const margin = stdDev * 0.5; // Espaço adicional baseado no desvio padrão
    return {
      min: mean - 3 * stdDev - margin,
      max: mean + 3 * stdDev + margin,
    };
  };

  const getChartData = (axis: "x" | "y" | "z") => {
    const values = sacDm.map((item) => parseFloat(item[`${axis}_value`].toFixed(8)));
    const means = Array(sacDm.length).fill(sacDmMean?.[`${axis}_mean`] ?? 0);
    const upperStandardDeviation = sacDmMean
      ? Array(sacDm.length).fill(
          sacDmMean[`${axis}_mean`] + sacDmMean[`${axis}_standard_deviation`]
        )
      : [];
    const lowerStandardDeviation = sacDmMean
      ? Array(sacDm.length).fill(
          sacDmMean[`${axis}_mean`] - sacDmMean[`${axis}_standard_deviation`]
        )
      : [];

    return {
      series: [
        { name: "Valor", data: values },
        { name: "Média", data: means },
        { name: "Desvio Padrão Superior", data: upperStandardDeviation },
        { name: "Desvio Padrão Inferior", data: lowerStandardDeviation },
      ],
      limits: calculateDynamicLimits(
        values,
        sacDmMean?.[`${axis}_mean`] ?? 0,
        sacDmMean?.[`${axis}_standard_deviation`] ?? 0
      ),
    };
  };

  const dataX = getChartData("x");
  const dataY = getChartData("y");
  const dataZ = getChartData("z");
  const status = checkDataStatus() === "Ok" ? statusOkStyle : statusFailStyle;

  const createOptionsChart = (limits: { min: number; max: number }) => {
    // Função para formatar valores em notação científica com expoente sobrescrito
    const formatScientific = (num: number): string => {
      const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
      const [coefficient, exponent] = num
        .toExponential(2)
        .split("e")
        .map((part, index) => (index === 1 ? parseInt(part) : parseFloat(part)));
  
      // Substituir números do expoente por seus equivalentes em Unicode
      const formattedExponent = exponent
        .toString()
        .split("")
        .map((char) => (char === "-" ? "⁻" : superscripts[parseInt(char)]))
        .join("");
  
      return `${coefficient.toString().replace(".", ",")} × 10${formattedExponent}`;
    };
  
    return {
      chart: {
        id: "device-metrics",
      },
      xaxis: {
        categories: sacDm.map((item: SacDmProps) => item.timestamp),
        labels: {
          show: false,
        },
      },
      yaxis: {
        min: limits.min,
        max: limits.max,
        labels: {
          formatter: (value: number) =>
            value ? formatScientific(value) : "0,00 × 10⁰",
          style: {
            colors: ["#E0E0E0"],
          },
        },
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (value: number) =>
            value ? formatScientific(value) : "0,00 × 10⁰",
        },
        fixed: {
          enabled: true,
        },
      },
      legend: {
        labels: {
          colors: ["#E0E0E0", "#E0E0E0", "#E0E0E0", "#E0E0E0"],
        },
      },
    };
  };
  
  

  return (
    <div style={containerStyle}>
      <div style={{ ...statusBoxStyle, ...status }}>{checkDataStatus()}</div>

      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
        <Section style={{ flex: 1, margin: "0 10px" }}>
          <h3>Eixo X</h3>
          <Chart options={createOptionsChart(dataX.limits)} series={dataX.series} type="line" height="300" />
        </Section>

        <Section style={{ flex: 1, margin: "0 10px" }}>
          <h3>Eixo Y</h3>
          <Chart options={createOptionsChart(dataY.limits)} series={dataY.series} type="line" height="300" />
        </Section>

        <Section style={{ flex: 1, margin: "0 10px" }}>
          <h3>Eixo Z</h3>
          <Chart options={createOptionsChart(dataZ.limits)} series={dataZ.series} type="line" height="300" />
        </Section>
      </div>

      {sacDm.length === 0 && (
        <EmptyData message="Nenhum dado encontrado para o dispositivo selecionado" />
      )}
    </div>
  );
};

export default SacDmDevice;
