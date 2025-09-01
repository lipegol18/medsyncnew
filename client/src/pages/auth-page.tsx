import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle2, HelpCircle, Clock, TrendingDown, TrendingUp, Shield, Monitor, Stethoscope, Eye, FileText, BarChart3, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import MedSyncLogo from '@/assets/medsync-logo-new.svg';
import blueSectionImage from '@assets/image_1753726436254.png';
import sectionDoctorImage from '@/assets/section_doctor_image.png';
import sectionYStylized from '@/assets/section_y_stylized.svg';
import iconHome1 from '@/assets/icons/icon_home_1.svg';
import iconHome2 from '@/assets/icons/icon_home_2.svg';
import iconHome3 from '@/assets/icons/icon_home_3.svg';
import iconHome4 from '@/assets/icons/icon_home_4.svg';
import iconDoctor from '@/assets/icons/icon-doctor.svg';
import avatarTest from '@/assets/avatar_test.png';
import { validateCPF, applyCPFMask, onlyNumbers } from '@/lib/utils';
import { useValidation } from '@/hooks/use-validation';

// Form schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  remember: z.boolean().optional()
});

const registerSchema = z.object({
  firstName: z.string().min(1, 'Nome é obrigatório'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório'),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  number: z.string().min(1, 'Número é obrigatório'),
  cep: z.string().min(8, 'CEP deve ter 8 dígitos').max(9, 'CEP inválido'),
  roleId: z.number().min(1, 'Função é obrigatória'),
  medicalSpecialtyId: z.number().min(1, 'Especialidade médica é obrigatória'),
  crm: z.number().min(1, 'CRM é obrigatório')
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória')
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedPlanCard, setSelectedPlanCard] = useState<'START' | 'PRO' | 'CLINICA' | null>(null);
  const [, setLocation] = useLocation();
  const { validateUnique, isValidating } = useValidation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  // Estados para hover sincronizado
  const [hoveredPlan, setHoveredPlan] = useState<'START' | 'PRO' | 'CLINICA' | null>(null);

  // Função para selecionar plano
  const handlePlanSelection = (planType: 'START' | 'PRO' | 'CLINICA') => {
    setSelectedPlanCard(planType);
    toast({
      title: `Plano ${planType} selecionado`,
      description: `Você selecionou o plano ${planType}. Continue para finalizar sua escolha.`,
    });
  };

  // Buscar planos de assinatura
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['/api/subscriptions/plans'],
  });

  // Force light theme on auth page
  useEffect(() => {
    const htmlElement = document.documentElement;
    const originalClasses = htmlElement.className;
    
    // Remove any existing theme classes and force light theme
    htmlElement.classList.remove('dark', 'light', 'system');
    htmlElement.classList.add('light', 'auth-page-forced-light');
    
    // Override any CSS custom properties if needed
    htmlElement.style.setProperty('color-scheme', 'light');
    
    console.log('Auth page: Forced light theme');
    
    // Cleanup function to restore original theme when leaving auth page
    return () => {
      htmlElement.className = originalClasses;
      htmlElement.classList.remove('auth-page-forced-light');
      htmlElement.style.removeProperty('color-scheme');
      console.log('Auth page: Restored original theme');
    };
  }, []);

  // Redirect authenticated users to welcome page
  useEffect(() => {
    if (!isLoading && user) {
      setLocation('/welcome');
    }
  }, [user, isLoading, setLocation]);

  // Check for reset password token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset');
    if (resetToken) {
      setShowResetForm(true);
      setShowModal(true);
      toast({ 
        title: 'Token de recuperação detectado',
        description: 'Digite sua nova senha abaixo'
      });
    }
  }, [toast]);

  // Form hooks
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false }
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '', username: '',
      password: '', confirmPassword: '', roleId: 2, medicalSpecialtyId: undefined, crm: undefined
    }
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Fetch medical specialties for registration
  const specialtiesQuery = useQuery({
    queryKey: ['/api/medical-specialties/public'],
    enabled: showModal && modalType === 'register'
  });

  // Mutations
  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => apiRequest('/api/auth/login', 'POST', data),
    onSuccess: async () => {
      // Invalidar queries de autenticação para forçar refresh
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Aguardar um pouco para garantir que a query foi atualizada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast({ title: 'Login realizado com sucesso!' });
      setShowModal(false);
      setLocation('/welcome');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro no login',
        description: error.message || 'Credenciais inválidas',
        variant: 'destructive'
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      // Preparar dados para o backend (que espera 'name' em vez de firstName + lastName)
      const backendData = {
        ...data,
        name: `${data.firstName} ${data.lastName}`
      };
      
      // Enviar para a API interna primeiro
      const result = await apiRequest('/api/register', 'POST', backendData);
      
      // Enviar dados para o webhook do n8n em background (não bloqueia o registro)
      fetch("https://lipegol18.app.n8n.cloud/webhook/validar-crm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then(response => {
        console.log('Webhook n8n executado:', response.status);
      }).catch(error => {
        console.warn('Webhook n8n falhou:', error);
      });
      
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Registro realizado com sucesso!' });
      setModalType('login');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro no registro',
        description: error.message || 'Erro ao criar conta',
        variant: 'destructive'
      });
    }
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      // Fazer a chamada para a API interna
      const result = await apiRequest('/api/forgot-password', 'POST', data);
      
      // Enviar dados para o webhook do n8n em background (não bloqueia a recuperação)
      const webhookData = {
        email: data.email,
        timestamp: new Date().toISOString(),
        action: 'forgot_password_request',
        origin: window.location.origin,
        token: result.token || null,
        reset_link: result.token ? `${window.location.origin}/auth?reset=${result.token}` : null
      };
      
      fetch("https://lipegol18.app.n8n.cloud/webhook/EsqueciASenha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      }).then(response => {
        console.log('Webhook n8n executado para recuperação de senha:', response.status);
        console.log('Dados enviados para webhook:', webhookData);
      }).catch(error => {
        console.warn('Webhook n8n falhou para recuperação de senha:', error);
      });
      
      return result;
    },
    onSuccess: (response: any) => {
      setResetEmailSent(true);
      
      if (response.token) {
        // Modo desenvolvimento - exibir token diretamente
        toast({ 
          title: 'Email falhou - Modo Desenvolvimento',
          description: `Acesse: ${window.location.origin}/auth?reset=${response.token}`,
          variant: 'destructive'
        });
        
        // Opcionalmente, copiar URL para clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(`${window.location.origin}/auth?reset=${response.token}`);
        }
        
        console.log('🔗 URL de reset de senha:', `${window.location.origin}/auth?reset=${response.token}`);
      } else {
        toast({ title: 'Email de recuperação enviado com sucesso!' });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar email',
        description: error.message || 'Erro ao processar solicitação',
        variant: 'destructive'
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordForm) => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('reset');
      return apiRequest('/api/reset-password', 'POST', { ...data, token });
    },
    onSuccess: () => {
      toast({ title: 'Senha atualizada com sucesso!' });
      setShowResetForm(false);
      setModalType('login');
      // Limpar URL
      window.history.replaceState({}, '', '/auth');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar senha',
        description: error.message || 'Token inválido ou expirado',
        variant: 'destructive'
      });
    }
  });

  // Form handlers
  const onLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  // Função auxiliar para validar campos únicos
  const handleFieldValidation = async (field: 'cpf' | 'crm' | 'phone' | 'email' | 'username', value: string) => {
    if (!value.trim()) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
      return;
    }
    
    const normalizedValue = field === 'cpf' ? onlyNumbers(value) : value;
    const isUnique = await validateUnique(field, normalizedValue);
    
    if (!isUnique) {
      const fieldNames = {
        cpf: 'CPF',
        crm: 'CRM', 
        phone: 'Telefone',
        email: 'Email',
        username: 'Username'
      };
      setValidationErrors(prev => ({ 
        ...prev, 
        [field]: `${fieldNames[field]} já está em uso`
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const onRegisterSubmit = async (data: RegisterForm) => {
    // Limpar erros de validação anteriores
    setValidationErrors({});
    
    // Validar unicidade de todos os campos obrigatórios
    const validationPromises = [
      validateUnique('cpf', onlyNumbers(data.cpf)),
      validateUnique('crm', data.crm.toString()),
      validateUnique('phone', data.phone),
      validateUnique('email', data.email),
      validateUnique('username', data.username)
    ];
    
    const [cpfUnique, crmUnique, phoneUnique, emailUnique, usernameUnique] = await Promise.all(validationPromises);
    
    const errors: Record<string, string> = {};
    if (!cpfUnique) errors.cpf = 'CPF já está em uso';
    if (!crmUnique) errors.crm = 'CRM já está em uso';
    if (!phoneUnique) errors.phone = 'Telefone já está em uso';
    if (!emailUnique) errors.email = 'Email já está em uso';
    if (!usernameUnique) errors.username = 'Username já está em uso';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: 'Erro no registro',
        description: 'Alguns campos já estão em uso. Verifique e tente novamente.',
        variant: 'destructive'
      });
      return;
    }
    
    // Normalizar CPF removendo formatação antes de enviar
    const normalizedData = {
      ...data,
      cpf: onlyNumbers(data.cpf)
    };
    registerMutation.mutate(normalizedData);
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  const onResetPasswordSubmit = (data: ResetPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  const handleLoginClick = () => {
    setModalType('login');
    setShowModal(true);
  };

  const handleRegisterClick = () => {
    setModalType('register');
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-muted shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-[9rem] py-0.5">
            {/* Logo */}
            <div className="flex items-center justify-center cursor-pointer">
              <img 
                src={MedSyncLogo} 
                alt="MedSync Logo" 
                className="h-32" 
              />
            </div>
            
            {/* Login/Register buttons */}
            <div className="flex border px-1 py-1 rounded-2xl" style={{borderColor: 'hsl(var(--medsync-blue))'}}>
              <Button
                onClick={handleLoginClick}
                variant="default"
                className="text-white px-8 py-2 rounded-xl font-medium text-base h-9 transition-all duration-200"
                style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(var(--accent))'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'hsl(var(--medsync-blue))'}
              >
                <strong>Login</strong>
              </Button>
              <Button
                onClick={handleRegisterClick}
                variant="ghost"
                className="bg-transparent px-8 py-2 rounded-xl font-medium text-base border-0 h-9 hover:bg-accent/10"
                style={{color: 'hsl(var(--medsync-blue))'}}
              >
                <strong>Registrar</strong>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 bg-cover bg-no-repeat md:bg-center" style={{
        backgroundImage: `url(${avatarTest})`,
        backgroundPosition: '65% center' // Mobile: médico posicionado à direita em 65%
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-start">
            {/* Left side - Text content aligned left */}
            <div className="text-white z-10 max-w-md lg:max-w-2xl -mt-8">
              <div className="mb-6 text-left relative">
                <img 
                  src={MedSyncLogo} 
                  alt="MedSync Logo" 
                  className="h-24 sm:h-32 lg:h-40 mb-6 ml-8 relative z-10" 
                />
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight -mt-8 sm:-mt-12 ml-4 sm:ml-16 font-lato">
                  <span className="text-white">Inteligência</span><br />
                  <span className="text-white whitespace-nowrap">Médica Integrada</span>
                </h1>
              </div>
              <p className="text-lg mb-4 text-primary/80 italic leading-relaxed text-center">
                "A Revolução nas Autorizações Cirúrgicas.<br />
                Menos espera. Mais cuidado."
              </p>
              <div className="text-left ml-16">
                <Button
                  onClick={handleRegisterClick}
                  variant="default"
                  className="text-white px-8 py-2 rounded-xl font-medium text-base h-9 transition-all duration-200"
                  style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(var(--accent))'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'hsl(var(--medsync-blue))'}
                >
                  <strong>Teste grátis</strong>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organization Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-6xl font-bold mb-4">
            <span style={{color: 'hsl(var(--medsync-blue))'}}>Organização</span><br />
            <span className="text-gray-900">Centralizada</span>
          </h2>
          <p className="text-md text-gray-600 mb-12 font-bold">
            Exames, laudos, documentos e pedidos em um só lugar.
          </p>
          
          {/* Four benefit cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img src={iconHome1} alt="Economia de tempo" className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{color: 'hsl(var(--medsync-blue))'}}>
                  Economia<br />de tempo
                </h3>
                <p className="text-sm text-gray-600">
                  Fluxos guiados e preenchimento automático.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img src={iconHome2} alt="Redução de glosas" className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{color: 'hsl(var(--medsync-blue))'}}>
                  Redução<br />de glosas
                </h3>
                <p className="text-sm text-gray-600">
                  Preenchimento técnico, testado previamente e baseado em normas da tabela <span className="font-medium" style={{color: 'hsl(var(--medsync-blue))'}}>CBHPM</span>.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img src={iconHome3} alt="Produção otimizada" className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{color: 'hsl(var(--medsync-blue))'}}>
                  Produção<br />otimizada
                </h3>
                <p className="text-sm text-gray-600">
                  Mais cirurgias realizadas, mais receita para você e sua equipe.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img src={iconHome4} alt="Segurança e Rastreio" className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{color: 'hsl(var(--medsync-blue))'}}>
                  Segurança<br />e Rastreio
                </h3>
                <p className="text-sm text-gray-600">
                  Cada pedido com histórico completo e backup.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Blue Section with Background Image */}
      <section 
        className="mb-16 relative overflow-hidden py-12 pb-28"
        style={{
          backgroundColor: 'hsl(var(--medsync-blue))',
          width: '100%',
          borderBottomLeftRadius: '60px',
          borderBottomRightRadius: '60px'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4 sm:gap-8">
          {/* Container da imagem do médico */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 sm:p-8 mx-4 sm:mx-8 flex-1 flex items-center justify-center sm:justify-end">
            <img 
              src={sectionDoctorImage} 
              alt="Doctor" 
              className="h-64 sm:h-80 lg:h-96 w-auto object-contain"
            />
          </div>
          
          {/* Container das caixas de texto com Y sobreposto */}
          <div className="relative mx-4 sm:mx-8">
            <div className="flex flex-col gap-4 sm:gap-8">
              {/* Primeira caixa */}
              <div className="flex justify-start pl-0 sm:pl-12 lg:pl-56">
                <div className="text-white text-base sm:text-xl font-medium leading-relaxed border border-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 max-w-xs sm:max-w-none">
                  <div className="w-1/2 h-px bg-white mb-3"></div>
                  <p>
                    Indicado para <strong>cirurgiões e<br />
                    clínicas</strong> que buscam eficiência<br />
                    e rastreabilidade nos processos<br />
                    cirúrgicos.
                  </p>
                </div>
              </div>
              
              {/* Segunda caixa */}
              <div className="flex justify-end pr-0 sm:pr-12 lg:pr-56 -mt-1 sm:-mt-8">
                <div className="text-white text-base sm:text-xl font-medium leading-relaxed border border-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 max-w-xs sm:max-w-none">
                  <div className="w-1/2 h-px bg-white mb-3"></div>
                  <p>
                    Ideal para <strong>médicos cirurgiões</strong><br />
                    que desejam ganhar tempo,<br />
                    evitar glosas e <strong>aumentar sua<br />
                    produtividade.</strong>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Y Stylized sobreposto apenas nas caixas de texto */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-20 sm:pt-32 lg:pt-44">
              <img 
                src={sectionYStylized} 
                alt="Y Stylized" 
                className="h-32 sm:h-48 lg:h-72 w-auto opacity-80 sm:opacity-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-12">
            O <span style={{color: 'hsl(var(--medsync-blue))'}}>sistema inteligente</span><br />
            que automatiza<br />
            pedidos cirúrgicos
          </h2>
          
          {/* Three feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{backgroundColor: 'hsl(var(--medsync-blue))'}}>
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">
                  Organiza toda a<br />documentação
                </h3>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{backgroundColor: 'hsl(var(--medsync-blue))'}}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">
                  Integra convênios<br />e hospitais
                </h3>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{backgroundColor: 'hsl(var(--medsync-blue))'}}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">
                  Acelera aprovação<br />de cirurgias
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Login/Register Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className={`${modalType === 'register' ? 'max-w-7xl' : 'max-w-2xl'} w-full bg-gray-50 rounded-2xl border-2 border-gray-100 shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto`}>
          {/* Cabeçalho completo */}
          <DialogHeader className="flex flex-col px-4 lg:px-6">
            {/* Logo no modal */}
            <div className="flex justify-center">
              <img 
                src={MedSyncLogo} 
                alt="MedSync Logo" 
                className="h-16 w-auto lg:h-24" 
              />
            </div>
            {modalType === 'forgot-password' && (
              <>
                <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
                  Recuperar senha
                </DialogTitle>
                <DialogDescription className="text-gray-600 leading-relaxed text-center">
                  Digite seu email para receber instruções de recuperação
                </DialogDescription>
              </>
            )}
            {modalType === 'login' && (
              <>
                <DialogTitle className="sr-only">
                  Login MedSync
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Faça login na plataforma MedSync
                </DialogDescription>
              </>
            )}
            {modalType === 'register' && (
              <>
                <DialogTitle className="sr-only">
                  Registro MedSync
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Registre-se na plataforma MedSync
                </DialogDescription>
              </>
            )}
            {modalType === 'reset-password' && (
              <>
                <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
                  Redefinir senha
                </DialogTitle>
                <DialogDescription className="text-gray-600 leading-relaxed text-center">
                  Digite sua nova senha
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          <div className="flex flex-col lg:flex-row">
            {/* Coluna dos Planos - Direita (primeira em mobile) - Apenas no registro */}
            {modalType === 'register' && (
            <div className="w-full lg:w-1/2 bg-gradient-to-br from-sky-50 to-sky-100 p-4 lg:p-8 flex flex-col order-1 lg:order-2" style={{fontFamily: 'Nunito, sans-serif'}}>
              <div className="text-center mb-0 lg:mb-0">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Conheça os Planos da Medsync</h2>
                <p className="text-accent font-medium text-sm lg:text-base">Temos o plano do tamanho ideal para sua Clínica/Hospital.</p>
                
                {/* CSS Connector Lines - Entre título e cards */}
                <div className="relative mt-6 mb-4 h-12 hidden sm:block flex justify-center items-start">
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-accent rounded-full" /> {/* Círculo no topo */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-6 w-0.5 bg-accent" /> {/* Linha vertical do centro */}
                  
                  {/* Linha curva à esquerda */}
                  <div className="absolute top-6 left-[calc(16.67%-12px)] w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-full" />
                  
                  {/* Linha curva à direita */}
                  <div className="absolute top-6 right-[calc(16.67%-12px)] w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-full" />
                  
                  {/* Linha horizontal central entre os arcos */}
                  <div className="absolute top-6 left-[calc(16.67%+12px)] right-[calc(16.67%+12px)] h-0.5 bg-accent" />
                  
                  {/* Linhas verticais para cards */}
                  <div className="absolute top-12 left-[calc(16.67%-12px)] h-6 w-0.5 bg-accent" /> {/* Linha para card 1 - START */}
                  <div className="absolute top-6 left-1/2 h-12 w-0.5 bg-accent transform -translate-x-1/2" /> {/* Linha para card 2 - PRO */}
                  <div className="absolute top-12 right-[calc(16.67%-12px)] h-6 w-0.5 bg-accent" /> {/* Linha para card 3 - CLÍNICA */}
                </div>
              </div>

              {/* Layout Mobile: Planos agrupados com suas funcionalidades */}
              <div className="block sm:hidden space-y-6">
                {/* START - Plano + Funcionalidades */}
                <div className="space-y-3">
                  <button 
                    onClick={() => handlePlanSelection('START')}
                    onMouseEnter={() => setHoveredPlan('START')}
                    onMouseLeave={() => setHoveredPlan(null)}
                    className={`w-full bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
                      hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
                    } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                  >
                    <div className="bg-sky-100 px-3 lg:px-4 py-2 lg:py-3">
                      <h3 className="text-xs lg:text-sm font-black text-accent text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano START</h3>
                    </div>
                    <div className="p-3 lg:p-4">
                      <div className="mb-0.5 text-center">
                        <span className="text-sm lg:text-lg font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>15 dias de</span><br/>
                        <span className="text-sm lg:text-base font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>Acesso Gratuito</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 text-left" style={{fontFamily: 'Nunito, sans-serif'}}>Sem fidelidade.<br/>Sem riscos.<br/>Sem cartão.<br/>Você decide no final.</p>
                    </div>
                  </button>

                  <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
                    hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
                  } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
                    <div className="bg-sky-100 px-3 lg:px-4 py-2 lg:py-3">
                      <p className="text-xs font-medium text-accent text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções Disponíveis</p>
                    </div>
                    <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Laudos automatizados</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Geração de texto inteligente</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Sugestão de codificação CBHPM/TUSS</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>OCR para cadastro de pacientes</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Relatórios e controle financeiro</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Suporte durante o período de teste</span>
                      </div>
                    </div>
                    <div className="text-center pb-3 lg:pb-4">
                      <div className="flex flex-col items-center justify-center">
                        <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                        <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRO - Plano + Funcionalidades */}
                <div className="space-y-3">
                  <button 
                    onClick={() => handlePlanSelection('PRO')}
                    onMouseEnter={() => setHoveredPlan('PRO')}
                    onMouseLeave={() => setHoveredPlan(null)}
                    className={`w-full bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
                      hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
                    } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                  >
                    <div className="bg-sky-400 px-3 lg:px-4 py-2 lg:py-3">
                      <h3 className="text-xs lg:text-sm font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano PRO</h3>
                    </div>
                    <div className="text-center px-2 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
{(() => {
                        const individualPlan = subscriptionPlans.find((plan: any) => plan.id === 2);
                        if (individualPlan) {
                          const monthlyPrice = (individualPlan.priceMonthly / 100);
                          const yearlyPrice = (individualPlan.priceYearly / 100) / 10;
                          const monthlyParts = monthlyPrice.toFixed(2).split('.');
                          const yearlyParts = yearlyPrice.toFixed(2).split('.');
                          return (
                            <div className="mb-2 lg:mb-3">
                              <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{monthlyParts[1]}</sup>
                              </div>
                              <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                              <div className="flex items-center justify-center gap-2">
                                <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                  <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                                  <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                                </div>
                              </div>
                              <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                                <span className="text-gray-600">Desconto de </span>
                                <span className="text-accent font-bold">30% no primeiro ano.</span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="mb-2 lg:mb-3">
                              <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-xl lg:text-4xl price-value text-accent">699</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                              </div>
                              <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                              <div className="flex items-center justify-center gap-2">
                                <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                  <span className="text-2xl price-value text-accent">838</span>
                                  <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,80</sup>
                                </div>
                              </div>
                              <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                                <span className="text-gray-600">Desconto de </span>
                                <span className="text-accent font-bold">30% no primeiro ano.</span>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </button>

                  <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
                    hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
                  } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
                    <div className="bg-sky-400 px-3 lg:px-4 py-2 lg:py-3">
                      <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funcionalidades</p>
                    </div>
                    <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Laudos automatizados</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Redução de glosas</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>OCR para cadastro de pacientes</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Relatórios por convênio, hospital e tipo de cirurgia</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Controle financeiro com cálculo de repasse líquido</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Onboarding e suporte especializado</span>
                      </div>
                    </div>
                    <div className="text-center pb-3 lg:pb-4">
                      <div className="flex flex-col items-center justify-center">
                        <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                        <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CLÍNICA - Plano + Funcionalidades */}
                <div className="space-y-3">
                  <button 
                    onClick={() => handlePlanSelection('CLINICA')}
                    onMouseEnter={() => setHoveredPlan('CLINICA')}
                    onMouseLeave={() => setHoveredPlan(null)}
                    className={`w-full bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
                      hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
                    } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                  >
                    <div className="bg-sky-600 px-3 lg:px-4 py-2 lg:py-3">
                      <h3 className="text-xs lg:text-sm font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano CLÍNICA</h3>
                    </div>
                    <div className="text-center px-3 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
{(() => {
                        const teamPlan = subscriptionPlans.find((plan: any) => plan.id === 3);
                        if (teamPlan) {
                          const monthlyPrice = (teamPlan.priceMonthly / 100);
                          const yearlyPrice = (teamPlan.priceYearly / 100) / 10;
                          const monthlyParts = monthlyPrice.toFixed(2).split('.');
                          const yearlyParts = yearlyPrice.toFixed(2).split('.');
                          return (
                            <div className="mb-2 lg:mb-3">
                              <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{monthlyParts[1]}</sup>
                              </div>
                              <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                              <div className="flex items-center justify-center gap-2">
                                <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                  <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                                  <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                                </div>
                              </div>
                              <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                                <span className="text-gray-600">Desconto de </span>
                                <span className="text-accent font-bold">30% no primeiro ano.</span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="mb-2 lg:mb-3">
                              <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-xl lg:text-4xl price-value text-accent">2796</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                              </div>
                              <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                              <div className="flex items-center justify-center gap-2">
                                <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                  <span className="text-2xl price-value text-accent">3.355</span>
                                  <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,20</sup>
                                </div>
                              </div>
                              <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                                <span className="text-gray-600">Desconto de </span>
                                <span className="text-accent font-bold">30% no primeiro ano.</span>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </button>

                  <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
                    hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
                  } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
                    <div className="bg-sky-600 px-3 lg:px-4 py-2 lg:py-3">
                      <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções turbinadas</p>
                    </div>
                    <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Relatórios centralizados por equipe</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Gestão por médico, hospital e convênio</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Indicadores clínico-financeiros</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Painel de repasses médicos</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-accent mr-1">✓</span>
                        <span>Suporte avançado e organização do faturamento</span>
                      </div>
                    </div>
                    <div className="text-center pb-3 lg:pb-4">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center space-x-1">
                          <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                          <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                          <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                          <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                          <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                        </div>
                        <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>Até 5 médicos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout Tablet/Desktop: Grid lado a lado */}
              <div className="hidden sm:block relative">

                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-6 sm:gap-4 lg:gap-3" style={{gridTemplateColumns: 'repeat(3, minmax(165px, 1fr))'}}>
                  {/* Plano START - Container Principal */}
                <button 
                  onClick={() => handlePlanSelection('START')}
                  onMouseEnter={() => setHoveredPlan('START')}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
                    hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
                  } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                >
                  <div className="bg-sky-100 px-3 lg:px-4 py-2 lg:py-3">
                    <h3 className="text-xs lg:text-sm font-black text-accent text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano START</h3>
                  </div>
                  <div className="p-3 lg:p-4">
                    <div className="mb-0.5 text-center">
                      <span className="text-sm lg:text-lg font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>15 dias de</span><br/>
                      <span className="text-sm lg:text-base font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>Acesso Gratuito</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 text-left" style={{fontFamily: 'Nunito, sans-serif'}}>Sem fidelidade.<br/>Sem riscos.<br/>Sem cartão.<br/>Você decide no final.</p>
                  </div>
                </button>

                {/* Plano PRO */}
                <button 
                  onClick={() => handlePlanSelection('PRO')}
                  onMouseEnter={() => setHoveredPlan('PRO')}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
                    hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
                  } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                >
                  <div className="bg-sky-400 px-3 lg:px-4 py-2 lg:py-3">
                    <h3 className="text-xs lg:text-sm font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano PRO</h3>
                  </div>
                  <div className="text-center px-2 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
{(() => {
                      const individualPlan = subscriptionPlans.find((plan: any) => plan.id === 2);
                      if (individualPlan) {
                        const monthlyPrice = (individualPlan.priceMonthly / 100);
                        const yearlyPrice = (individualPlan.priceYearly / 100) / 10;
                        const monthlyParts = monthlyPrice.toFixed(2).split('.');
                        const yearlyParts = yearlyPrice.toFixed(2).split('.');
                        return (
                          <div className="mb-2 lg:mb-3">
                            <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{monthlyParts[1]}</sup>
                            </div>
                            <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                            <div className="flex items-center justify-center gap-2">
                              <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                              </div>
                            </div>
                            <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                              <span className="text-gray-600">Desconto de </span>
                              <span className="text-accent font-bold">30% no primeiro ano.</span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="mb-2 lg:mb-3">
                            <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-xl lg:text-4xl price-value text-accent">699</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                            </div>
                            <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                            <div className="flex items-center justify-center gap-2">
                              <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-2xl price-value text-accent">838</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,80</sup>
                              </div>
                            </div>
                            <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                              <span className="text-gray-600">Desconto de </span>
                              <span className="text-accent font-bold">30% no primeiro ano.</span>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </button>

                {/* Plano CLÍNICA */}
                <button 
                  onClick={() => handlePlanSelection('CLINICA')}
                  onMouseEnter={() => setHoveredPlan('CLINICA')}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
                    hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
                  } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                >
                  <div className="bg-sky-600 px-3 lg:px-4 py-2 lg:py-3">
                    <h3 className="text-xs lg:text-sm font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano CLÍNICA</h3>
                  </div>
                  <div className="text-center px-3 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
{(() => {
                      const teamPlan = subscriptionPlans.find((plan: any) => plan.id === 3);
                      if (teamPlan) {
                        const monthlyPrice = (teamPlan.priceMonthly / 100);
                        const yearlyPrice = (teamPlan.priceYearly / 100) / 10;
                        const monthlyParts = monthlyPrice.toFixed(2).split('.');
                        const yearlyParts = yearlyPrice.toFixed(2).split('.');
                        return (
                          <div className="mb-2 lg:mb-3">
                            <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{monthlyParts[1]}</sup>
                            </div>
                            <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                            <div className="flex items-center justify-center gap-2">
                              <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                              </div>
                            </div>
                            <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                              <span className="text-gray-600">Desconto de </span>
                              <span className="text-accent font-bold">30% no primeiro ano.</span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="mb-2 lg:mb-3">
                            <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-xl lg:text-4xl price-value text-accent">2796</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                            </div>
                            <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                            <div className="flex items-center justify-center gap-2">
                              <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                                <span className="text-2xl price-value text-accent">3.355</span>
                                <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,20</sup>
                              </div>
                            </div>
                            <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                              <span className="text-gray-600">Desconto de </span>
                              <span className="text-accent font-bold">30% no primeiro ano.</span>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </button>
              </div>
              </div>

              {/* Linhas conectoras entre planos e funcionalidades */}
              <div className="relative h-8 sm:h-4 hidden sm:block z-0">
                {/* Linha conectora START */}
                <div className="absolute top-0 left-[calc(16.67%-12px)] h-4 w-0.5 bg-accent z-0"></div>
                {/* Linha conectora PRO */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-4 w-0.5 bg-accent z-0"></div>
                {/* Linha conectora CLÍNICA */}
                <div className="absolute top-0 right-[calc(16.67%-12px)] h-4 w-0.5 bg-accent z-0"></div>
              </div>

              {/* Containers de Funcionalidades - Grid lado a lado */}
              <div className="hidden sm:flex sm:flex-col sm:grid sm:grid-cols-3 gap-6 sm:gap-4 lg:gap-3 mt-8 sm:mt-0" style={{gridTemplateColumns: 'repeat(3, minmax(165px, 1fr))'}}>
                {/* Plano START - Container de Funcionalidades */}
                <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
                  hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
                } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
                  <div className="bg-sky-100 px-3 lg:px-4 py-2 lg:py-3">
                    <p className="text-xs font-medium text-accent text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções Disponíveis</p>
                  </div>
                  <div className="px-3 lg:px-4 pt-3 lg:pt-4 pb-8 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Laudos automatizados</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Geração de texto inteligente</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Sugestão de codificação CBHPM/TUSS</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>OCR para cadastro de pacientes</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Relatórios e controle financeiro</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Suporte durante o período de teste</span>
                    </div>
                  </div>
                  <div className="text-center pb-3 lg:pb-4">
                    <div className="flex flex-col items-center justify-center">
                      <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                      <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
                    </div>
                  </div>
                </div>

                {/* Plano PRO - Container de Funcionalidades */}
                <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
                  hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
                } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
                  <div className="bg-sky-400 px-3 lg:px-4 py-2 lg:py-3">
                    <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funcionalidades</p>
                  </div>
                  <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Laudos automatizados</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Redução de glosas</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>OCR para cadastro de pacientes</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Relatórios por convênio, hospital e tipo de cirurgia</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Controle financeiro com cálculo de repasse líquido</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Onboarding e suporte especializado</span>
                    </div>
                  </div>
                  <div className="text-center pb-3 lg:pb-4">
                    <div className="flex flex-col items-center justify-center">
                      <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                      <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
                    </div>
                  </div>
                </div>

                {/* Plano CLÍNICA - Container de Funcionalidades */}
                <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
                  hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
                } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
                  <div className="bg-sky-600 px-3 lg:px-4 py-2 lg:py-3">
                    <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções turbinadas</p>
                  </div>
                  <div className="px-3 lg:px-4 pt-3 lg:pt-4 pb-8 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Relatórios centralizados por equipe</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Gestão por médico, hospital e convênio</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Indicadores clínico-financeiros</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Painel de repasses médicos</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-accent mr-1">✓</span>
                      <span>Suporte avançado e organização do faturamento</span>
                    </div>
                  </div>
                  <div className="text-center pb-3 lg:pb-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center space-x-1">
                        <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                        <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                        <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                        <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                        <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                      </div>
                      <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>Até 5 médicos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Coluna do Formulário - Esquerda (segunda em mobile) */}
            <div className={`w-full ${modalType === 'register' ? 'lg:w-1/2' : 'lg:w-full'} ${modalType === 'register' ? 'p-4 lg:p-8' : 'p-6 lg:p-12'} bg-white flex flex-col order-2 lg:order-1`}>
            {modalType === 'login' && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">Bem-vindo de volta!</h2>
                <p className="text-gray-600 leading-relaxed font-bold">Faça login para acessar sua conta</p>
              </div>
            )}
            {showResetForm ? (
            /* Reset Password Form */
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Redefinir senha</h2>
                <p className="text-gray-600">Digite sua nova senha abaixo</p>
              </div>
              
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="reset-password" className="text-gray-700 font-medium">Nova senha</Label>
                  <Input
                    {...resetPasswordForm.register('password')}
                    id="reset-password"
                    type="password"
                    placeholder="Digite sua nova senha"
                    className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors text-base px-4"
                  />
                  {resetPasswordForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">{resetPasswordForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="reset-confirmPassword" className="text-gray-700 font-medium">Confirmar nova senha</Label>
                  <Input
                    {...resetPasswordForm.register('confirmPassword')}
                    id="reset-confirmPassword"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors text-base px-4"
                  />
                  {resetPasswordForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-sm">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
                  style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
                  onMouseEnter={(e) => !resetPasswordMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--accent))')}
                  onMouseLeave={(e) => !resetPasswordMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--medsync-blue))')}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {resetPasswordMutation.isPending ? "Atualizando..." : "Atualizar senha"}
                </Button>
              </form>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    setModalType('login');
                    // Limpar URL
                    window.history.replaceState({}, '', '/auth');
                  }}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  Voltar ao login
                </button>
              </div>
            </div>
          ) : modalType === 'forgot-password' ? (
            // Formulário de recuperação de senha
            <div className="space-y-4">
              {!resetEmailSent ? (
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="forgot-email" className="text-gray-700 font-medium">Email</Label>
                    <Input
                      {...forgotPasswordForm.register('email')}
                      id="forgot-email"
                      type="email"
                      placeholder="Digite seu email cadastrado"
                      className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors text-base px-4"
                    />
                    {forgotPasswordForm.formState.errors.email && (
                      <p className="text-red-500 text-sm">{forgotPasswordForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
                    style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
                    onMouseEnter={(e) => !forgotPasswordMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--accent))')}
                    onMouseLeave={(e) => !forgotPasswordMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--medsync-blue))')}
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : null}
                    {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar instruções"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setModalType('login')}
                      className="text-sm text-primary hover:text-primary/80 underline"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Email enviado!</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                    </p>
                    <button
                      onClick={() => {
                        setModalType('login');
                        setResetEmailSent(false);
                        forgotPasswordForm.reset();
                      }}
                      className="text-sm text-primary hover:text-primary/80 underline"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : modalType === 'login' ? (
            <div className="space-y-6">
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="username" className="text-gray-700 font-bold text-base">E-mail</Label>
                  <Input
                    {...loginForm.register('username')}
                    id="username"
                    placeholder="m@example.com"
                    className="w-full h-12 rounded-xl border border-gray-300 focus:border-accent focus:outline-none transition-all text-base px-4"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-red-500 text-sm">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-700 font-bold text-base">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setModalType('forgot-password')}
                      className="text-sm text-gray-700 hover:text-gray-500 font-bold transition-colors"
                    >
                      Esqueceu a sua senha?
                    </button>
                  </div>
                  <Input
                    {...loginForm.register('password')}
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    className="w-full h-12 rounded-xl border border-gray-300 focus:border-accent focus:outline-none transition-all text-base px-4"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-start pt-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      {...loginForm.register('remember')}
                      id="remember"
                      className="rounded-md border-2 border-gray-300 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                    />
                    <Label htmlFor="remember" className="text-sm text-gray-600 font-medium">
                      Lembrar de mim
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
                  style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
                  onMouseEnter={(e) => !loginMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--accent))')}
                  onMouseLeave={(e) => !loginMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--medsync-blue))')}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {loginMutation.isPending ? "Entrando..." : "Login"}
                </Button>
              </form>
              
              <div className="text-center mt-6">
                <span className="text-sm text-gray-600 font-bold">Ainda não tem uma conta? </span>
                <button
                  type="button"
                  onClick={() => setModalType('register')}
                  className="text-sm text-accent hover:text-accent/80 font-bold transition-colors"
                >
                  Registrar
                </button>
              </div>
            </div>
          ) : modalType === 'register' ? (
            <div>
              <div className="text-left mb-6">
                <h2 className="text-2xl font-black text-gray-900">Bem-vindo!</h2>
                <p className="text-gray-600 leading-relaxed font-bold text-sm">Crie sua conta para começar a usar</p>
              </div>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-1 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-firstName" className="text-sm text-gray-700 font-bold">Nome</Label>
                    <Input
                      {...registerForm.register('firstName')}
                      id="reg-firstName"
                      placeholder="Nome"
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-lastName" className="text-sm text-gray-700 font-bold">Sobrenome</Label>
                    <Input
                      {...registerForm.register('lastName')}
                      id="reg-lastName"
                      placeholder="Sobrenome"
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.lastName && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 -mt-1">
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-cpf" className="text-sm text-gray-700 font-bold">CPF</Label>
                    <Input
                      {...registerForm.register('cpf')}
                      id="reg-cpf"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      onChange={(e) => {
                        const maskedValue = applyCPFMask(e.target.value);
                        registerForm.setValue('cpf', maskedValue);
                      }}
                      onBlur={(e) => handleFieldValidation('cpf', e.target.value)}
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.cpf && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.cpf.message}</p>
                    )}
                    {validationErrors.cpf && (
                      <p className="text-red-500 text-xs">{validationErrors.cpf}</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-crm-top" className="text-sm text-gray-700 font-bold">CRM</Label>
                    <Input
                      {...registerForm.register('crm', { valueAsNumber: true })}
                      id="reg-crm-top"
                      type="number"
                      placeholder="123456"
                      onBlur={(e) => handleFieldValidation('crm', e.target.value)}
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.crm && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.crm.message}</p>
                    )}
                    {validationErrors.crm && (
                      <p className="text-red-500 text-xs">{validationErrors.crm}</p>
                    )}
                  </div>
                </div>

                {/* Campos de Endereço - movidos para baixo do CPF e CRM */}
                <div className="grid grid-cols-4 gap-3 -mt-1">
                  <div className="col-span-3 space-y-0.5">
                    <Label htmlFor="reg-address" className="text-sm text-gray-700 font-bold">Endereço</Label>
                    <Input
                      {...registerForm.register('address')}
                      id="reg-address"
                      placeholder="Rua, Avenida..."
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.address && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.address.message}</p>
                    )}
                  </div>
                  <div className="col-span-1 space-y-0.5">
                    <Label htmlFor="reg-number" className="text-sm text-gray-700 font-bold">Nº</Label>
                    <Input
                      {...registerForm.register('number')}
                      id="reg-number"
                      placeholder="123"
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.number && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.number.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5 -mt-1">
                  <Label htmlFor="reg-cep" className="text-sm text-gray-700 font-bold">CEP</Label>
                  <Input
                    {...registerForm.register('cep')}
                    id="reg-cep"
                    placeholder="00000-000"
                    maxLength={9}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length > 5) {
                        value = value.slice(0, 5) + '-' + value.slice(5, 8);
                      }
                      registerForm.setValue('cep', value);
                    }}
                    className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                  />
                  {registerForm.formState.errors.cep && (
                    <p className="text-red-500 text-xs">{registerForm.formState.errors.cep.message}</p>
                  )}
                </div>

                {/* Usuário e Telefone na mesma linha após o CEP */}
                <div className="grid grid-cols-2 gap-3 -mt-1">
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-username" className="text-sm text-gray-700 font-bold">Nome do Perfil</Label>
                    <Input
                      {...registerForm.register('username')}
                      id="reg-username"
                      placeholder="usuario"
                      onBlur={(e) => handleFieldValidation('username', e.target.value)}
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.username.message}</p>
                    )}
                    {validationErrors.username && (
                      <p className="text-red-500 text-xs">{validationErrors.username}</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-phone" className="text-sm text-gray-700 font-bold">Telefone</Label>
                    <Input
                      {...registerForm.register('phone')}
                      id="reg-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      onBlur={(e) => handleFieldValidation('phone', e.target.value)}
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.phone && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.phone.message}</p>
                    )}
                    {validationErrors.phone && (
                      <p className="text-red-500 text-xs">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5 -mt-1">
                  <Label htmlFor="reg-email" className="text-sm text-gray-700 font-bold">Email</Label>
                  <Input
                    {...registerForm.register('email')}
                    id="reg-email"
                    type="email"
                    placeholder="seu@email.com"
                    onBlur={(e) => handleFieldValidation('email', e.target.value)}
                    className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-red-500 text-xs">{registerForm.formState.errors.email.message}</p>
                  )}
                  {validationErrors.email && (
                    <p className="text-red-500 text-xs">{validationErrors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 -mt-1">
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-password" className="text-sm text-gray-700 font-bold">Senha</Label>
                    <Input
                      {...registerForm.register('password')}
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="reg-confirm-password" className="text-sm text-gray-700 font-bold">Confirmar</Label>
                    <Input
                      {...registerForm.register('confirmPassword')}
                      id="reg-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>



                <div className="space-y-0.5 -mt-1">
                  <Label htmlFor="reg-specialty" className="text-sm text-gray-700 font-bold">Especialidade Médica</Label>
                  <Select 
                    value={registerForm.watch('medicalSpecialtyId')?.toString() || ""} 
                    onValueChange={(value) => registerForm.setValue('medicalSpecialtyId', parseInt(value))}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors">
                      <SelectValue placeholder="Selecione sua especialidade médica" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-2 border-gray-200">
                      {Array.isArray(specialtiesQuery.data) && specialtiesQuery.data.map((specialty: any) => (
                        <SelectItem key={specialty.id} value={specialty.id.toString()}>
                          {specialty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {registerForm.formState.errors.medicalSpecialtyId && (
                    <p className="text-red-500 text-xs">{registerForm.formState.errors.medicalSpecialtyId.message}</p>
                  )}
                </div>
              </form>

              <Button
                onClick={() => registerForm.handleSubmit(onRegisterSubmit)()}
                className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
                style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
                onMouseEnter={(e) => !registerMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--accent))')}
                onMouseLeave={(e) => !registerMutation.isPending && (e.target.style.backgroundColor = 'hsl(var(--medsync-blue))')}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                {registerMutation.isPending ? "Registrando..." : "Registrar"}
              </Button>
              
              {/* Link para login */}
              <div className="text-center mt-3">
                <p className="text-sm text-gray-600">
                  Já tem uma conta?{' '}
                  <button 
                    onClick={() => {
                      setShowModal(false);
                      setModalType('login');
                      setShowModal(true);
                    }}
                    className="text-accent hover:text-accent/80 font-semibold"
                  >
                    Login
                  </button>
                </p>
              </div>
            </div>
          ) : null}
              
              {/* Rodapé com termos e políticas */}
              <div className="text-center mt-4">
                <p className="text-xs text-gray-600 font-bold">
                  Ao clicar em continuar, você concorda com nossos{' '}
                  <a href="#" className="text-accent hover:text-accent/80 underline font-bold">
                    Termos de Serviço
                  </a>
                  {' '}e{' '}
                  <a href="#" className="text-accent hover:text-accent/80 underline font-bold">
                    Política de Privacidade
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
