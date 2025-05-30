import { Box, Button, Input, Text, VStack, useToast } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const VerificationForm = () => {
  const {
    email,
    setEmail,
    code,
    setCode,
    isCodeSent,
    isVerified,
    isLoading,
    error,
    sendVerificationCode,
    verifyCode,
  } = useAuth();
  
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSendCode = async () => {
    await sendVerificationCode();
    toast({
      title: 'Código enviado',
      description: 'Te hemos enviado un código de verificación a tu correo electrónico.',
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleVerifyCode = async () => {
    const success = await verifyCode();
    if (success) {
      toast({
        title: '¡Verificación exitosa!',
        description: 'Tu correo ha sido verificado correctamente.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirect to the original page or home after successful verification
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  };

  if (isVerified) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          ¡Verificación exitosa!
        </Text>
        <Text>Tu correo {email} ha sido verificado correctamente.</Text>
        <Button 
          mt={4} 
          colorScheme="blue" 
          onClick={() => navigate('/app')}
          width="100%"
        >
          Continuar a la aplicación
        </Button>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" maxW="md" mx="auto" mt={8}>
      <VStack spacing={4}>
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          Verificación de correo electrónico
        </Text>

        {!isCodeSent ? (
          <>
            <Text>Ingresa tu correo electrónico para recibir un código de verificación:</Text>
            <Input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isDisabled={isLoading}
            />
            <Button
              colorScheme="blue"
              onClick={handleSendCode}
              isLoading={isLoading}
              loadingText="Enviando..."
              width="100%"
            >
              Enviar código
            </Button>
          </>
        ) : (
          <>
            <Text>Se ha enviado un código de verificación a {email}</Text>
            <Input
              type="text"
              placeholder="Código de verificación"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              isDisabled={isLoading}
            />
            <Button
              colorScheme="green"
              onClick={handleVerifyCode}
              isLoading={isLoading}
              loadingText="Verificando..."
              width="100%"
            >
              Verificar código
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setCode('');
                setEmail('');
              }}
              isDisabled={isLoading}
            >
              Cambiar correo electrónico
            </Button>
          </>
        )}

        {error && (
          <Text color="red.500" textAlign="center">
            {error}
          </Text>
        )}
      </VStack>
    </Box>
  );
};
