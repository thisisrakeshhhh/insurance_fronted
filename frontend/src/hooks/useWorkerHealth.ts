import { useQuery } from '@tanstack/react-query'
import { checkHealth } from '@/api/worker'

export function useWorkerHealth() {
  return useQuery({
    queryKey: ['worker-health'],
    queryFn: checkHealth,
    refetchInterval: 15000,
    retry: 2,
    staleTime: 10000,
  })
}
