import { useEffect, useState } from 'react';

// third-party
import ReactApexChart from 'react-apexcharts';

// project-imports
import MainCard from 'components/MainCard';

// chart-options
const earningChartOptions = {
  chart: {
    toolbar: {
      show: false
    }
  },
  dataLabels: {
    enabled: false
  },
  markers: {
    size: 6,
    hover: {
      size: 5
    }
  },
  stroke: {
    curve: 'straight',
    width: 6
  },

  grid: {
    xaxis: {
      lines: {
        show: false
      }
    },
    yaxis: {
      lines: {
        show: false
      }
    }
  },

  tooltip: {
    x: {
      show: false
    },

    marker: {
      show: false
    }
  },

  yaxis: {
    labels: {
      show: false
    }
  },

  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    axisTicks: {
      show: false
    },
    axisBorder: {
      show: false
    }
  }
};

// =============================|| DEFAULT - EARNING CHART ||============================== //

export default function EarningChart({ totalEarnings, loading }) {
  const [series] = useState([{ name: 'Market Days ', data: [10, 60, 45, 72, 45, 86], color: '#fff' }]);

  const [options, setOptions] = useState(earningChartOptions);

  useEffect(() => {
    setOptions({
      ...earningChartOptions,
      chart: { ...earningChartOptions.chart },
      xaxis: { ...earningChartOptions.xaxis, labels: { style: { colors: '#000000' } } }
    });
  }, []);

  const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return 'N/A';
    }

    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const totalLabel = loading ? 'Loading...' : formatCurrency(totalEarnings ?? 0);

  return (
    <MainCard
      title={<p className="mb-0 text-black">Earnings</p>}
      headerClassName="border-0"
      className="bg-primary overflow-hidden"
      bodyClassName="py-0"
    >
      <div className="earning-text">
        <h3 className="mb-2 text-black f-w-300">
          {totalLabel} <i className="ph ph-arrow-up" />
        </h3>
        <span className="text-uppercase text-black d-block">Total Earnings</span>
      </div>
      <ReactApexChart options={options} series={series} type="line" height={210} />
    </MainCard>
  );
}
