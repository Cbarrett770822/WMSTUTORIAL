import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectAllProcesses, initializeProcessesData, fetchProcesses } from '../../features/processes/processesSlice';
import { selectIsAuthenticated } from '../../features/auth/authSlice';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  useTheme,
  alpha,
  Divider,
  Avatar,
  Chip
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VerifiedIcon from '@mui/icons-material/Verified';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';

// Equal size card component for consistent card heights
const EqualSizeCard = ({ children, height = 'auto', ...props }) => {
  return (
    <Card 
      {...props} 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: height, 
        width: '100%',
        ...props.sx
      }}
    >
      {children}
    </Card>
  );
};

// Industry verticals component
const IndustryVerticals = () => {
  const industries = [
    { name: 'Retail', icon: <InventoryIcon /> },
    { name: 'Manufacturing', icon: <WarehouseIcon /> },
    { name: 'Distribution', icon: <LocalShippingIcon /> },
    { name: 'Healthcare', icon: <VerifiedIcon /> },
    { name: 'Automotive', icon: <SpeedIcon /> },
    { name: 'Food & Beverage', icon: <CheckCircleIcon /> }
  ];

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Industry Verticals
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
        gap: 2 
      }}>
        {industries.map((industry, index) => (
          <Paper 
            key={index}
            elevation={1}
            sx={{ 
              p: 2, 
              textAlign: 'center',
              borderRadius: 2,
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 3
              }
            }}
          >
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main', 
                mx: 'auto',
                mb: 1,
                width: 50,
                height: 50
              }}
            >
              {industry.icon}
            </Avatar>
            <Typography variant="body2">{industry.name}</Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

const DarkHomePage = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const navigate = useNavigate();
  const processes = useSelector(selectAllProcesses);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [categoryProcesses, setCategoryProcesses] = useState({});

  // Define darker colors
  const darkColors = {
    primary: {
      dark: '#0d1b3e',
      main: '#1a3a6a',
      light: '#2c5282'
    },
    secondary: {
      dark: '#7f0000',
      main: '#c62828',
      light: '#ef5350'
    },
    benefits: {
      green: '#1b5e20',
      blue: '#0d47a1',
      orange: '#e65100',
      purple: '#4a148c'
    }
  };

  // Benefit cards data
  const benefitCards = [
    {
      icon: <VerifiedIcon sx={{ fontSize: 40 }} />,
      title: 'Inventory Accuracy',
      description: 'Improve inventory accuracy to over 99% with real-time tracking and cycle counting',
      color: darkColors.benefits.green,
      stat: '99%+',
      statLabel: 'Accuracy Rate'
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      title: 'Productivity Boost',
      description: 'Increase warehouse productivity by up to 50% through optimized workflows',
      color: darkColors.benefits.blue,
      stat: '50%',
      statLabel: 'Productivity Increase'
    },
    {
      icon: <LocalShippingIcon sx={{ fontSize: 40 }} />,
      title: 'Order Accuracy',
      description: 'Achieve over 99.9% order accuracy with barcode verification and guided processes',
      color: darkColors.benefits.orange,
      stat: '99.9%',
      statLabel: 'Order Accuracy'
    },
    {
      icon: <BarChartIcon sx={{ fontSize: 40 }} />,
      title: 'Space Optimization',
      description: 'Optimize warehouse space utilization by up to 30% with intelligent slotting',
      color: darkColors.benefits.purple,
      stat: '30%',
      statLabel: 'Space Savings'
    }
  ];

  // Process category cards data
  const processCardTemplates = [
    {
      title: 'Inbound Processes',
      icon: <InventoryIcon sx={{ fontSize: 40 }} />,
      color: darkColors.benefits.green,
      description: 'Learn how a WMS optimizes receiving, putaway, and quality inspection processes to reduce errors and accelerate dock-to-stock time.',
      category: 'inbound'
    },
    {
      title: 'Storage Processes',
      icon: <WarehouseIcon sx={{ fontSize: 40 }} />,
      color: darkColors.benefits.blue,
      description: 'Discover how a WMS improves inventory management, cycle counting, and space utilization through intelligent storage strategies.',
      category: 'storage'
    },
    {
      title: 'Outbound Processes',
      icon: <LocalShippingIcon sx={{ fontSize: 40 }} />,
      color: darkColors.benefits.orange,
      description: 'Explore how a WMS streamlines picking, packing, and shipping to increase accuracy and throughput while reducing labor costs.',
      category: 'outbound'
    },
    {
      title: 'Advanced Processes',
      icon: <SpeedIcon sx={{ fontSize: 40 }} />,
      color: darkColors.benefits.purple,
      description: 'Learn how a WMS handles advanced processes efficiently and provides powerful analytics for continuous improvement.',
      category: 'advanced'
    }
  ];
  
  // Initialize processes data when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('DarkHomePage: User is authenticated, initializing processes data');
      // First mark as initialized
      dispatch(initializeProcessesData());
      // Then fetch the actual data with a slight delay to ensure initialization is processed
      setTimeout(() => {
        console.log('DarkHomePage: Fetching processes data');
        dispatch(fetchProcesses());
      }, 100);
    } else {
      console.log('DarkHomePage: User not authenticated, skipping processes initialization');
    }
  }, [dispatch, isAuthenticated]);

  // Group processes by category
  useEffect(() => {
    // Skip processing if user is not authenticated
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping process data processing');
      return;
    }
    
    // Initialize categories
    const processesByCategory = {};
    processCardTemplates.forEach(template => {
      processesByCategory[template.category] = [];
    });
    
    // Safely handle allProcesses when it's not an array
    if (processes && Array.isArray(processes)) {
      // Group processes by their category
      processes.forEach(process => {
        const category = process.category;
        if (processesByCategory[category]) {
          processesByCategory[category].push(process.title);
        } else if (category === 'returns' && processesByCategory['advanced']) {
          // Add returns processes to advanced category
          processesByCategory['advanced'].push(process.title);
        }
      });
    } else {
      console.log('Processes data is not available or not an array');
    }
    
    setCategoryProcesses(processesByCategory);
  }, [processes, isAuthenticated]);
  
  // Create process cards with actual processes
  const processCards = processCardTemplates.map(template => ({
    ...template,
    processes: categoryProcesses[template.category] || []
  }));

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: 4,
          overflow: 'hidden',
          mb: 8,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          background: `linear-gradient(135deg, ${darkColors.primary.dark} 0%, ${darkColors.primary.main} 100%)`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: 'url(https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0
          }}
        />
        
        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
          <Box sx={{ width: { xs: '100%', md: '50%' }, p: { xs: 4, md: 6 }, position: 'relative', zIndex: 1 }}>
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom 
              sx={{ 
                color: theme.palette.common.white,
                fontWeight: 800,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                lineHeight: 1.2,
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}
            >
              Infor WMS Demo Assist
            </Typography>
            
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom 
              sx={{ 
                color: alpha(theme.palette.common.white, 0.9),
                fontWeight: 500,
                mb: 3,
                textShadow: '0 1px 5px rgba(0,0,0,0.1)'
              }}
            >
              Optimizing warehouse operations with Infor WMS
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              {/* Bullet points removed as requested */}
            </Box>
          </Box>
          
          <Box sx={{ width: { xs: '100%', md: '50%' }, display: { xs: 'none', md: 'flex' }, position: 'relative' }}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}
            >
              <Box
                component="img"
                src="https://img.freepik.com/free-vector/warehouse-workers-carrying-boxes-with-loader_74855-6541.jpg"
                alt="Warehouse Management"
                sx={{
                  width: '90%',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))',
                  transform: 'scale(1.1)'
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Key Benefits Section */}
      <Box sx={{ mb: 8, maxWidth: '900px', mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography 
            variant="overline" 
            sx={{ 
              color: darkColors.primary.main,
              fontWeight: 'bold',
              letterSpacing: 1.5,
              mb: 1,
              display: 'block'
            }}
          >
            KEY BENEFITS
          </Typography>
          <Typography 
            variant="h3" 
            component="h2" 
            gutterBottom 
            sx={{ 
              fontWeight: 700, 
              color: darkColors.primary.dark,
              mb: 2
            }}
          >
            Why Implement a WMS?
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              maxWidth: '800px', 
              mx: 'auto',
              fontSize: '1.1rem'
            }}
          >
            A Warehouse Management System delivers measurable improvements across all areas of your operation, 
            from inventory control to labor productivity and order fulfillment.
          </Typography>
        </Box>
        
        {/* 2x2 Grid for Benefit Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
          gap: 3 
        }}>
          {benefitCards.map((benefit, index) => (
            <Box key={index} sx={{ display: 'flex' }}>
              <EqualSizeCard height={320}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    transition: 'all 0.3s',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                      transform: 'translateY(-5px)',
                      borderColor: 'transparent'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(benefit.color, 0.1),
                        color: benefit.color,
                        width: 64,
                        height: 64,
                        mb: 2
                      }}
                    >
                      {benefit.icon}
                    </Avatar>
                    
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, fontSize: '1.25rem', color: darkColors.primary.dark, height: '40px', display: 'flex', alignItems: 'center' }}>
                      {benefit.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, height: '80px', overflow: 'hidden' }}>
                      {benefit.description}
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'baseline',
                      mt: 'auto',
                      pt: 2,
                      borderTop: `1px dashed ${theme.palette.divider}`
                    }}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 700, 
                          color: benefit.color,
                          mr: 1 
                        }}
                      >
                        {benefit.stat}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {benefit.statLabel}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </EqualSizeCard>
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Process Categories Section */}
      <Box 
        sx={{ 
          mb: 8,
          p: 5,
          borderRadius: 4,
          bgcolor: alpha(darkColors.primary.dark, 0.02),
          border: `1px solid ${alpha(darkColors.primary.main, 0.1)}`
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography 
            variant="overline" 
            sx={{ 
              color: darkColors.primary.main,
              fontWeight: 'bold',
              letterSpacing: 1.5,
              mb: 1,
              display: 'block'
            }}
          >
            PROCESS CATEGORIES
          </Typography>
          <Typography 
            variant="h3" 
            component="h2" 
            gutterBottom 
            sx={{ 
              fontWeight: 700, 
              color: darkColors.primary.dark,
              mb: 2
            }}
          >
            Warehouse Flow
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              maxWidth: '800px', 
              mx: 'auto',
              fontSize: '1.1rem'
            }}
          >
            The complete warehouse workflow, from receiving to shipping and returns processing.
            Select any category to explore detailed process Flow.
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
          gap: 3 
        }}>
          {processCards.map((category, index) => (
            <Box key={index} sx={{ display: 'flex' }}>
              <EqualSizeCard height={380}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                    '&:hover': {
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                      transform: 'translateY(-5px)',
                      borderColor: 'transparent'
                    }
                  }}
                >
                  <CardActionArea 
                    onClick={() => {
                      // Map the card title to the appropriate tab value
                      let tabValue = 'all';
                      if (category.title === 'Inbound Processes') tabValue = 'inbound';
                      else if (category.title === 'Storage Processes') tabValue = 'storage';
                      else if (category.title === 'Outbound Processes') tabValue = 'outbound';
                      else if (category.title === 'Returns & Analytics') tabValue = 'returns';
                      
                      // Navigate to processes page with the selected category
                      navigate(`/processes?category=${tabValue}`);
                    }} 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'stretch',
                      height: '100%'
                    }}
                  >
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(category.color, 0.1),
                            color: category.color,
                            width: 56,
                            height: 56,
                            mr: 2
                          }}
                        >
                          {category.icon}
                        </Avatar>
                        <Typography variant="h5" component="h3" sx={{ fontWeight: 600, color: darkColors.primary.dark }}>
                          {category.title}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: '80px', overflow: 'hidden' }}>
                        {category.description}
                      </Typography>
                    </Box>
                    
                    <Divider />
                    
                    <Box sx={{ p: 2, bgcolor: alpha(category.color, 0.03), height: '100px', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                        Key Processes:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {category.processes.map((process, idx) => (
                          <Chip 
                            key={idx} 
                            label={process} 
                            size="small" 
                            sx={{ 
                              bgcolor: alpha(category.color, 0.1),
                              color: category.color,
                              fontWeight: 500
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              </EqualSizeCard>
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Industry Verticals Section */}
      <Box 
        sx={{ 
          my: 8,
          py: 4,
          px: 2,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          background: '#ffffff',
        }}
      >
        <Container maxWidth="xl">
          <IndustryVerticals />
        </Container>
      </Box>
      
      {/* Add keyframes for the pulse animation */}
      <Box
        sx={{
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(0.95)',
              opacity: 0.7,
            },
            '50%': {
              transform: 'scale(1.05)',
              opacity: 0.3,
            },
            '100%': {
              transform: 'scale(0.95)',
              opacity: 0.7,
            },
          },
        }}
      />
    </Container>
  );
};

export default DarkHomePage;
