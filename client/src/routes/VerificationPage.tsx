import { Box } from '@chakra-ui/react';
import { VerificationForm } from '../features/auth/VerificationForm';

export function VerificationPage() {
  return (
    <Box p={4} minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <Box maxW="md" w="100%">
        <VerificationForm />
      </Box>
    </Box>
  );
}
