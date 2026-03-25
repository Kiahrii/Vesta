import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// third-party
import ReactApexChart from 'react-apexcharts';

// react-bootstrap
import Button from 'react-bootstrap/Button';

// project-imports
import MainCard from 'components/MainCard';

// chart-options
const pieChartOptions = {
  chart: {
    toolbar: {
      show: false
    }
  },
  dataLabels: {
    enabled: true,
    formatter: function(val) {
      return Math.round(val) + '%';
    },
    style: {
      fontSize: '16px',
      fontWeight: 600
    }
  },
  legend: {
    position: 'bottom',
    fontSize: '16px',
    fontFamily: 'inherit'
  },
  colors: ['#79B791', '#73A1B2', '#BC2023', '#95E1D3'],
  tooltip: {
    theme: 'light',
    y: {
      formatter: function(val) {
        return Math.round(val) + '%';
      }
    }
  },
  plotOptions: {
    pie: {
      dataLabels: {
        offset: -5,
        minAngleToShowLabel: 10
      }
    }
  }
};

const pieChartSeries = [45, 35, 15];
const pieChartLabels = ['Paid', 'Partially Paid', 'Overdue'];

// =============================|| DEFAULT - PIE CHART ||============================== //

export default function PieChart({ height, series, labels }) {
  const navigate = useNavigate();
  const [options, setOptions] = useState({
    ...pieChartOptions,
    labels: labels ?? pieChartLabels
  });

  useEffect(() => {
    setOptions({
      ...pieChartOptions,
      labels: labels ?? pieChartLabels
    });
  }, [labels]);

  return (
    <div>
      <MainCard title="Payment Overview">
        <ReactApexChart options={options} series={series ?? pieChartSeries} type="pie" height={height ?? 400} />
      </MainCard>
    </div>
  );
}
