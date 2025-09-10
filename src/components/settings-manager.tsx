'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Cloud,
  Database,
  Link,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { environments } from '@/lib/environments';
import FirebaseConnectionInfo from './firebase-connection-info';
import { useSync } from '@/contexts/sync-context';

function getIntervalInMs(value: string, unit: 'seconds' | 'minutes' | 'hours') {
  const numValue = parseInt(value, 10);
  switch (unit) {
    case 'seconds':
      return numValue * 1000;
    case 'minutes':
      return numValue * 60 * 1000;
    case 'hours':
      return numValue * 60 * 60 * 1000;
    default:
      return 30000;
  }
}

function getIntervalFromMs(
  ms: number
): [string, 'seconds' | 'minutes' | 'hours'] {
  const seconds = ms / 1000;
  if (seconds < 60) return [String(seconds), 'seconds'];
  const minutes = seconds / 60;
  if (minutes < 60) return [String(minutes), 'minutes'];
  const hours = minutes / 60;
  return [String(hours), 'hours'];
}

const formSchema = z.object({
  intervalValue: z.string().min(1, 'O valor deve ser maior que 0.'),
  intervalUnit: z.enum(['seconds', 'minutes', 'hours']),
  apiUrl: z.string().url('Por favor, insira uma URL válida.'),
  currentEnvironmentId: z.string(),
  firebaseTarget: z.string(),
});

type SettingsFormData = z.infer<typeof formSchema>;

export default function SettingsManager() {
  const { state, dispatch } = useSync();
  const { toast } = useToast();

  const selectedEnv = environments.find(
    e => e.id === state.currentEnvironmentId
  );

  const [intervalValue, intervalUnit] = getIntervalFromMs(state.syncInterval);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      intervalValue: intervalValue,
      intervalUnit: intervalUnit,
      apiUrl: state.apiUrl,
      currentEnvironmentId: state.currentEnvironmentId,
      firebaseTarget: selectedEnv?.firebaseTarget || '',
    },
    values: {
      intervalValue: intervalValue,
      intervalUnit: intervalUnit,
      apiUrl: state.apiUrl,
      currentEnvironmentId: state.currentEnvironmentId,
      firebaseTarget: selectedEnv?.firebaseTarget || '',
    }
  });

  const onSubmit = (data: SettingsFormData) => {
    const newInterval = getIntervalInMs(data.intervalValue, data.intervalUnit);
    dispatch({ type: 'SET_INTERVAL', interval: newInterval });
    dispatch({ type: 'SET_ENVIRONMENT', id: data.currentEnvironmentId });

    toast({
      title: 'Configurações Salvas',
      description: 'Suas configurações de sincronização foram atualizadas.',
    });
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ambiente e Intervalo</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="currentEnvironmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Database/> Ambiente de Origem</FormLabel>
                    <Select
                      onValueChange={value => {
                        field.onChange(value);
                        const newEnv = environments.find(e => e.id === value);
                        if (newEnv) {
                          form.setValue('apiUrl', newEnv.url, { shouldValidate: true });
                          form.setValue('firebaseTarget', newEnv.firebaseTarget, { shouldValidate: true });
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um ambiente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {environments.map(env => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Link/> URL de Consulta (GET)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://api.example.com/data"
                        {...field}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firebaseTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Cloud/> Destino no Firebase</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="storage/pasta/"
                        {...field}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="intervalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervalo</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="intervalUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="seconds">Segundos</SelectItem>
                          <SelectItem value="minutes">Minutos</SelectItem>
                          <SelectItem value="hours">Horas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full">
                Salvar Configurações
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <FirebaseConnectionInfo />
    </div>
  );
}
